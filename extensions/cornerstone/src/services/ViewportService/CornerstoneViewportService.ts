import { vec3 } from 'gl-matrix';
import { PubSubService } from '@ohif/core';
import { Types as OhifTypes } from '@ohif/core';
import type { PlanarViewport, ECGViewport } from '@cornerstonejs/core';
import {
  RenderingEngine,
  Types,
  getRenderingEngine,
  utilities as csUtils,
  cache,
  Enums as csEnums,
  metaData,
} from '@cornerstonejs/core';

import { utilities as csToolsUtils, Enums as csToolsEnums } from '@cornerstonejs/tools';
import type { Synchronizer } from '@cornerstonejs/tools';
import { IViewportService } from './IViewportService';
import { RENDERING_ENGINE_ID } from './constants';
import { VOLUME_LOADER_SCHEME } from '../../constants';
import ViewportInfo, {
  DisplaySetOptions,
  PublicViewportOptions,
  ViewportOptions,
  getDisplaySetOptionsAppearance,
} from './Viewport';
import { StackViewportData, VolumeViewportData } from '../../types/CornerstoneCacheService';
import {
  LutPresentation,
  PositionPresentation,
  Presentations,
  SegmentationPresentation,
  SegmentationPresentationItem,
} from '../../types/Presentation';

import JumpPresets from '../../utils/JumpPresets';
import { useLutPresentationStore } from '../../stores/useLutPresentationStore';
import { usePositionPresentationStore } from '../../stores/usePositionPresentationStore';
import { useSynchronizersStore } from '../../stores/useSynchronizersStore';
import { useSegmentationPresentationStore } from '../../stores/useSegmentationPresentationStore';
import getClosestOrientationFromIOP from '../../utils/isReferenceViewable';
import {
  getPlanarOr3DViewport,
  isECGViewport,
  isVolumeViewport3D,
} from '../../utils/viewportTypeGuards';
import { BlendModes } from '@cornerstonejs/core/enums';
import { isAutoHydrateViewportType } from '../../utils/autoHydrateViewportTypes';
import { getViewportDataShape } from '../../utils/viewportDataShape';
import { mountStack, mountVolumes } from './viewportMounts';
import { viewportOperations } from './viewportOperations';
import {
  driveCameraPositionSync,
  getCameraPositionGroupStart,
  getCameraPositionSyncGroupIds,
  getMountSliceStep,
  getViewSliceStep,
  holdCameraPositionSync,
  placeInCameraPositionGroups,
} from './cameraPositionGroups';
import {
  WITH_ORIENTATION,
  getLutPresentation,
  getPositionPresentation,
  setLutPresentation,
  setPositionPresentation,
  withoutShownViewReference,
} from './viewportPresentations';

const EVENTS = {
  VIEWPORT_DATA_CHANGED: 'event::cornerstoneViewportService:viewportDataChanged',
};

const MIN_STACK_VIEWPORTS_TO_ENQUEUE_RESIZE = 12;
const MIN_VOLUME_VIEWPORTS_TO_ENQUEUE_RESIZE = 6;

export const WITH_NAVIGATION = { withNavigation: true, withOrientation: false };
export { WITH_ORIENTATION };

/**
 * Handles cornerstone viewport logic including enabling, disabling, and
 * updating the viewport.
 */
class CornerstoneViewportService extends PubSubService implements IViewportService {
  static REGISTRATION = {
    name: 'cornerstoneViewportService',
    altName: 'CornerstoneViewportService',
    create: ({
      servicesManager,
    }: OhifTypes.Extensions.ExtensionParams): CornerstoneViewportService => {
      return new CornerstoneViewportService(servicesManager);
    },
  };

  renderingEngine: Types.IRenderingEngine | null;
  viewportsById: Map<string, ViewportInfo> = new Map();
  viewportGridResizeObserver: ResizeObserver | null;
  viewportsDisplaySets: Map<string, string[]> = new Map();
  beforeResizePositionPresentations: Map<string, PositionPresentation> = new Map();

  // Some configs
  servicesManager: AppTypes.ServicesManager = null;

  resizeQueue = [];
  viewportResizeTimer = null;
  gridResizeDelay = 50;
  gridResizeTimeOut = null;

  constructor(servicesManager: AppTypes.ServicesManager) {
    super(EVENTS);
    this.renderingEngine = null;
    this.viewportGridResizeObserver = null;
    this.servicesManager = servicesManager;
  }
  hangingProtocolService: unknown;
  viewportsInfo: unknown;
  sceneVolumeInputs: unknown;
  viewportDivElements: unknown;
  ViewportPropertiesMap: unknown;
  volumeUIDs: unknown;
  displaySetsNeedRerendering: unknown;
  viewportDisplaySets: unknown;

  /**
   * Adds the HTML element to the viewportService
   * @param {*} viewportId
   * @param {*} elementRef
   */
  public enableViewport(viewportId: string, elementRef: HTMLDivElement): void {
    const viewportInfo = new ViewportInfo(viewportId);
    viewportInfo.setElement(elementRef);
    this.viewportsById.set(viewportId, viewportInfo);
  }

  public getViewportIds(): string[] {
    return Array.from(this.viewportsById.keys());
  }

  /**
   * It retrieves the renderingEngine if it does exist, or creates one otherwise
   * @returns {RenderingEngine} rendering engine
   */
  public getRenderingEngine() {
    // get renderingEngine from cache if it exists
    const renderingEngine = getRenderingEngine(RENDERING_ENGINE_ID);

    if (renderingEngine) {
      this.renderingEngine = renderingEngine;
      return this.renderingEngine;
    }

    if (!renderingEngine || renderingEngine.hasBeenDestroyed) {
      this.renderingEngine = new RenderingEngine(RENDERING_ENGINE_ID);
    }

    return this.renderingEngine;
  }

  /**
   * It triggers the resize on the rendering engine, and renders the viewports
   *
   */
  public resize() {
    // https://stackoverflow.com/a/26279685
    // This resize() call, among other things, rerenders the viewports. But when the entire viewer is
    // display: none'd, it makes the size of all hidden elements 0, including the viewport canvas and its containers.
    // Even if the viewer is later displayed again, trying to render when the size is 0 permanently "breaks" the
    // viewport, making it fully black even after the size is normal again. So just ignore resize events when hidden:
    const areViewportsHidden = Array.from(this.viewportsById.values()).every(viewportInfo => {
      const element = viewportInfo.getElement();

      return element.clientWidth === 0 && element.clientHeight === 0;
    });
    if (areViewportsHidden) {
      console.warn('Ignoring resize when viewports have size 0');
      return;
    }

    const numStackViewportsInViewportGrid = Array.from(this.viewportsById.values()).filter(
      viewportInfo => viewportInfo.getDataShape() === 'stack'
    ).length;

    const numVolumeViewportsInViewportGrid = Array.from(this.viewportsById.values()).filter(
      viewportInfo => viewportInfo.getDataShape() === 'volume'
    ).length;

    const isEasyResize =
      numStackViewportsInViewportGrid <= MIN_STACK_VIEWPORTS_TO_ENQUEUE_RESIZE &&
      numVolumeViewportsInViewportGrid <= MIN_VOLUME_VIEWPORTS_TO_ENQUEUE_RESIZE;

    // if there is a grid resize happening, it means the viewport grid
    // has been manipulated (e.g., panels closed, added, etc.) and we need
    // to resize all viewports, so we will add a timeout here to make sure
    // we don't double resize the viewports when viewports in the grid are
    // resized individually
    if (isEasyResize) {
      this.performResize();
      this.resetGridResizeTimeout();
      this.resizeQueue = [];
      clearTimeout(this.viewportResizeTimer);
    } else {
      this.enqueueViewportResizeRequest();
    }
  }

  /**
   * Removes the viewport from cornerstone, and destroys the rendering engine
   */
  public destroy() {
    this._removeResizeObserver();
    this.viewportGridResizeObserver = null;
    try {
      this.renderingEngine?.destroy?.();
    } catch (e) {
      console.warn('Rendering engine not destroyed', e);
    }
    this.viewportsDisplaySets.clear();
    this.renderingEngine = null;
    cache.purgeCache();
  }

  /**
   * Disables the viewport inside the renderingEngine, if no viewport is left
   * it destroys the renderingEngine.
   *
   * This is called when the element goes away entirely - with new viewportId's
   * created for every new viewport, this will be called whenever the set of
   * viewports is changed, but NOT when the viewport position changes only.
   *
   * @param viewportId - The viewportId to disable
   */
  public disableElement(viewportId: string): void {
    this.renderingEngine?.disableElement(viewportId);

    // clean up
    this.viewportsById.delete(viewportId);
    this.viewportsDisplaySets.delete(viewportId);
  }

  /**
   * Sets the presentations for a given viewport. Presentations is an object
   * that can define the lut or position for a viewport.
   *
   * @param viewportId - The ID of the viewport.
   * @param presentations - The presentations to apply to the viewport.
   * @param viewportInfo - Contains a view reference for immediate application
   */
  public setPresentations(viewportId: string, presentations: Presentations): void {
    const viewport = this.getCornerstoneViewport(viewportId);

    if (!viewport || !presentations) {
      return;
    }

    const { lutPresentation, positionPresentation, segmentationPresentation } = presentations;

    // Always set the segmentation presentation first, since there might be some
    // lutpresentation states that need to be set on the segmentation
    // Todo: i think we should even await this
    this._setSegmentationPresentation(viewport, segmentationPresentation);

    setLutPresentation(viewport, lutPresentation);
    setPositionPresentation(viewport, { ...positionPresentation, viewportId });
  }

  /**
   * Stores the presentation state for a given viewport inside the
   * each store. This is used to persist the presentation state
   * across different scenarios e.g., when the viewport is changing the
   * display set, or when the viewport is moving to a different layout.
   *
   * @param viewportId The ID of the viewport.
   */
  public storePresentation({ viewportId }) {
    const presentationIds = this.getPresentationIds(viewportId);
    const { syncGroupService } = this.servicesManager.services;
    const synchronizers = syncGroupService.getSynchronizersForViewport(viewportId);

    if (!presentationIds || Object.keys(presentationIds).length === 0) {
      return null;
    }

    const { lutPresentationId, positionPresentationId, segmentationPresentationId } =
      presentationIds;

    const positionPresentation = this._getPositionPresentation(viewportId);
    const lutPresentation = this._getLutPresentation(viewportId);
    const segmentationPresentation = this._getSegmentationPresentation(viewportId);

    const { setLutPresentation } = useLutPresentationStore.getState();
    const { setPositionPresentation } = usePositionPresentationStore.getState();
    const { setSynchronizers } = useSynchronizersStore.getState();
    const { syncSegmentationPresentation } = useSegmentationPresentationStore.getState();

    if (lutPresentationId) {
      setLutPresentation(lutPresentationId, lutPresentation);
    }

    if (positionPresentationId) {
      setPositionPresentation(positionPresentationId, positionPresentation);
    }

    if (segmentationPresentationId) {
      syncSegmentationPresentation(
        segmentationPresentationId,
        (segmentationPresentation ?? []).map(item => ({
          ...item,
          hydrated: this._getInitialHydrationForSync(item.segmentationId),
        }))
      );
    }

    if (synchronizers?.length) {
      setSynchronizers(
        viewportId,
        synchronizers.map(synchronizer => ({
          id: synchronizer.id,
          sourceViewports: [...synchronizer.getSourceViewports()],
          targetViewports: [...synchronizer.getTargetViewports()],
        }))
      );
    }
  }

  /**
   * Retrieves the presentations for a given viewport.
   * @param viewportId - The ID of the viewport.
   * @returns The presentations for the viewport.
   */
  public getPresentations(viewportId: string): Presentations {
    const positionPresentation = this._getPositionPresentation(viewportId);
    const lutPresentation = this._getLutPresentation(viewportId);
    const segmentationPresentation = this._getSegmentationPresentation(viewportId);

    return {
      positionPresentation,
      lutPresentation,
      segmentationPresentation,
    };
  }

  private getPresentationIds(viewportId: string): AppTypes.PresentationIds | null {
    const viewportInfo = this.viewportsById.get(viewportId);
    if (!viewportInfo) {
      return null;
    }

    return viewportInfo.getPresentationIds();
  }

  private _getPositionPresentation(viewportId: string): PositionPresentation {
    const csViewport = this.getCornerstoneViewport(viewportId);
    if (!csViewport) {
      return;
    }

    const viewportInfo = this.viewportsById.get(viewportId);

    return getPositionPresentation(csViewport, viewportInfo, viewportId);
  }

  private _getLutPresentation(viewportId: string): LutPresentation {
    const csViewport = this.getCornerstoneViewport(viewportId);

    if (!csViewport) {
      return;
    }

    return getLutPresentation(csViewport, this.viewportsById.get(viewportId));
  }

  private _getSegmentationPresentation(viewportId: string): SegmentationPresentation {
    const { segmentationService } = this.servicesManager.services;

    const presentation = segmentationService.getPresentation(viewportId);
    return presentation;
  }

  /**
   * The `hydrated` to record for a segmentation the presentation store has not
   * heard of yet (`syncSegmentationPresentation` keeps the recorded value for
   * one it has).
   *
   * Hydration is owned by the hydration paths exactly when they can record it,
   * and `updateStoredSegmentationPresentation` keys the store by the referenced
   * display set - so a segmentation whose display set has one gets `null` ("no
   * statement"), leaving it to the hydration prompt, the segmentation panel and
   * the study browser to say whether it belongs in the standard view. Anything
   * else - a segmentation drawn in the client, or one whose display set has not
   * been registered yet - has no other record, so the viewport it lives in is
   * the authority and it is recorded as shown.
   */
  private _getInitialHydrationForSync(segmentationId: string): boolean | null {
    const { displaySetService } = this.servicesManager.services;

    const displaySet = displaySetService.getDisplaySetByUID(segmentationId);

    return displaySet?.referencedDisplaySetInstanceUID ? null : true;
  }

  /**
   * Sets the viewport data for a viewport.
   * @param viewportId - The ID of the viewport to set the data for.
   * @param viewportData - The viewport data to set.
   * @param publicViewportOptions - The public viewport options.
   * @param publicDisplaySetOptions - The public display set options.
   * @param presentations - The presentations to set.
   */
  public setViewportData(
    viewportId: string,
    viewportData: StackViewportData | VolumeViewportData,
    publicViewportOptions: PublicViewportOptions,
    publicDisplaySetOptions: DisplaySetOptions[],
    presentations?: Presentations
  ): void {
    const renderingEngine = this.getRenderingEngine();

    // if not valid viewportData then return early
    if (getViewportDataShape(viewportData) === 'stack') {
      // check if imageIds is valid
      if (!viewportData.data[0].imageIds?.length) {
        return;
      }
    }

    // This is the old viewportInfo, which may have old options but we might be
    // using its viewport (same viewportId as the new viewportInfo)
    const viewportInfo = this.viewportsById.get(viewportId);

    // We should store the presentation for the current viewport since we can't only
    // rely to store it WHEN the viewport is disabled since we might keep around the
    // same viewport/element and just change the viewportData for it (drag and drop etc.)
    // the disableElement storePresentation handle would not be called in this case
    // and we would lose the presentation.
    this.storePresentation({ viewportId: viewportInfo.getViewportId() });

    // Todo: i don't like this here, move it
    this.servicesManager.services.segmentationService.clearSegmentationRepresentations(
      viewportInfo.getViewportId()
    );

    if (!viewportInfo) {
      throw new Error('element is not enabled for the given viewportId');
    }

    // override the viewportOptions and displaySetOptions with the public ones
    // since those are the newly set ones, we set them here so that it handles defaults
    const displaySetOptions = viewportInfo.setPublicDisplaySetOptions(publicDisplaySetOptions);
    // Specify an over-ride for the viewport type, even though it is in the public
    // viewport options, because the one in the viewportData is a requirement based on the
    // type of data being displayed.
    const viewportOptions = viewportInfo.setPublicViewportOptions(
      publicViewportOptions,
      viewportData.viewportType
    );

    const element = viewportInfo.getElement();
    const type = viewportInfo.getViewportType();
    const background = viewportInfo.getBackground();
    const orientation = viewportInfo.getOrientation();
    const displayArea = viewportInfo.getDisplayArea();

    const viewportInput: Types.PublicViewportInput = {
      viewportId,
      element,
      type,
      defaultOptions: {
        background,
        orientation,
        displayArea,
      },
    };

    // Rendering Engine Id set should happen before enabling the element
    // since there are callbacks that depend on the renderingEngine id
    // Todo: however, this is a limitation which means that we can't change
    // the rendering engine id for a given viewport which might be a super edge
    // case
    viewportInfo.setRenderingEngineId(renderingEngine.id);

    // Todo: this is not optimal at all, we are re-enabling the already enabled
    // element which is not what we want. But enabledElement as part of the
    // renderingEngine is designed to be used like this. This will trigger
    // ENABLED_ELEMENT again and again, which will run onEnableElement callbacks
    renderingEngine.enableElement(viewportInput);

    viewportInfo.setViewportOptions(viewportOptions);
    viewportInfo.setDisplaySetOptions(displaySetOptions);
    viewportInfo.setViewportData(viewportData);
    viewportInfo.setViewportId(viewportId);

    this.viewportsById.set(viewportId, viewportInfo);

    const viewport = renderingEngine.getViewport(viewportId);
    const displaySetPromise = this._setDisplaySets(
      viewport,
      viewportData,
      viewportInfo,
      presentations
    );

    // The broadcast event here ensures that listeners have a valid, up to date
    // viewport to access.  Doing it too early can result in exceptions or
    // invalid data.
    displaySetPromise.then(
      () => {
        this._broadcastEvent(this.EVENTS.VIEWPORT_DATA_CHANGED, {
          viewportData,
          viewportId,
        });
      },
      error => console.error('[CornerstoneViewportService] Failed to set the viewport data', error)
    );
  }

  public getViewportOptions(viewportId: string): ViewportOptions {
    return this.viewportsById.get(viewportId).getViewportOptions();
  }

  /**
   * Retrieves the Cornerstone viewport with the specified ID.
   *
   * @param viewportId - The ID of the viewport.
   * @returns The Cornerstone viewport object if found, otherwise null.
   */
  public getCornerstoneViewport(viewportId: string): Types.IViewport | null {
    const viewportInfo = this.getViewportInfo(viewportId);

    if (!viewportInfo || !this.renderingEngine || this.renderingEngine.hasBeenDestroyed) {
      return null;
    }

    const viewport = this.renderingEngine.getViewport(viewportId);

    return viewport;
  }

  /**
   * Retrieves the viewport information for a given viewport ID. The viewport information
   * is the OHIF construct that holds different options and data for a given viewport and
   * is different from the cornerstone viewport.
   *
   * @param viewportId The ID of the viewport.
   * @returns The viewport information.
   */
  public getViewportInfo(viewportId: string): ViewportInfo {
    return this.viewportsById.get(viewportId);
  }

  public getOrientation(viewportId: string): string {
    const viewportInfo = this.getViewportInfo(viewportId);
    return viewportInfo.getOrientation();
  }

  /**
   * Looks through the viewports to see if the specified measurement can be
   * displayed in one of the viewports. This function tries to get a "best fit"
   * viewport to display the image in where it matches, in order:
   *   * Active viewport that can be navigated to the given image without orientation change
   *   * Other viewport that can be navigated to the given image without orientation change
   *   * Best-aligned viewport that can display the image with an orientation change
   *
   * It returns `null` otherwise, indicating that a viewport needs display set/type
   * changes in order to display the image.
   *
   * Notes:
   *   * If the display set is displayed in multiple viewports all needing orientation change,
   *     then the active one or first one listed will be modified.  This can create unexpected
   *     behaviour for MPR views.
   *   * If the image is contained in multiple display sets, then the first one
   *     found will be navigated (active first, followed by first found)
   *
   * @param measurement - The measurement that is desired to view.
   * @param activeViewportId - the index that was active at the time the jump
   *          was initiated.
   * @return the viewportId that the measurement should be displayed in.
   */
  public findNavigationCompatibleViewportId(activeViewportId: string, metadata): string {
    // First check if the active viewport can just be navigated to show the given item
    const activeViewport = this.getCornerstoneViewport(activeViewportId);
    if (!activeViewport) {
      console.warn('No active viewport found for', activeViewportId);
    }
    if (activeViewport?.isReferenceViewable(metadata, WITH_NAVIGATION)) {
      return activeViewportId;
    }

    // Next, see if any viewport could be navigated to show the given item,
    // without considering orientation changes.
    for (const id of this.viewportsById.keys()) {
      const viewport = this.getCornerstoneViewport(id);
      if (viewport?.isReferenceViewable(metadata, WITH_NAVIGATION)) {
        return id;
      }
    }

    // Compute view-plane alignment scores for all viewports to prefer the one
    // requiring the least orientation change when navigation-only is not possible.
    const viewportAlignmentData = this.getViewportAlignmentData(metadata);

    // See if any viewport could show this with an orientation change
    for (const { viewportId: id } of viewportAlignmentData) {
      const viewport = this.getCornerstoneViewport(id);
      if (viewport?.isReferenceViewable(metadata, WITH_ORIENTATION)) {
        return id;
      }
    }

    // No luck, need to update the viewport itself
    return null;
  }

  /**
   * Given a metadata instance containing a planeRestriction, returns the
   * ordered list of best orientation match viewport ids.
   *
   * This uses the planeRestriction preferentially as that one is more reliably
   * filled than the viewport normal since it is created from data points on
   * rehydration.
   */
  public getViewportAlignmentData(metadata) {
    const viewportAlignmentData = [];
    const { viewPlaneNormal: refViewPlaneNormal, planeRestriction } = metadata;
    const inPlaneVector1 = planeRestriction?.inPlaneVector1;
    const inPlaneVector2 = planeRestriction?.inPlaneVector2;

    for (const id of this.viewportsById.keys()) {
      const viewport = this.getCornerstoneViewport(id);
      const viewPlaneNormal = viewport.getViewReference()?.viewPlaneNormal;

      if (!viewPlaneNormal) {
        continue;
      }
      let alignmentScore = 0;
      if (inPlaneVector1 || inPlaneVector2) {
        const inPlane1Score = inPlaneVector1
          ? -Math.abs(vec3.dot(viewPlaneNormal, inPlaneVector1))
          : 0;
        const inPlane2Score = inPlaneVector2
          ? -Math.abs(vec3.dot(viewPlaneNormal, inPlaneVector2))
          : 0;
        alignmentScore = inPlane1Score + inPlane2Score;
      } else if (refViewPlaneNormal) {
        alignmentScore = Math.abs(vec3.dot(viewPlaneNormal, refViewPlaneNormal));
      }
      viewportAlignmentData.push({ viewportId: id, alignmentScore });
    }

    // Try best-aligned viewports first
    viewportAlignmentData.sort((a, b) => b.alignmentScore - a.alignmentScore);
    return viewportAlignmentData;
  }

  /**
   * Figures out which viewport to update when the viewport type needs to change.
   * Orchestrates the search strategies in order of preference.
   */
  public findUpdateableViewportConfiguration(activeViewportId: string, measurement) {
    const { metadata, displaySetInstanceUID } = measurement;
    const { displaySetService } = this.servicesManager.services;
    const displaySet = displaySetService.getDisplaySetByUID(displaySetInstanceUID);

    // 1. Determine the target Viewport Type (Stack vs Volume)
    const viewportType = this.determineTargetViewportType(displaySet, metadata);

    // 2. Strategy: Find viewport already showing this volume
    const volumeMatch = this.findViewportShowingVolume(
      metadata,
      displaySetInstanceUID,
      viewportType
    );
    if (volumeMatch) {
      return volumeMatch;
    }

    // 3. Strategy: Find viewport with compatible orientation (even if different display set)
    const compatibleMatch = this.findViewportConvertibleToVolume(
      metadata,
      displaySetInstanceUID,
      viewportType
    );
    if (compatibleMatch) {
      return compatibleMatch;
    }

    // 4. Strategy: Find viewport with matching orientation via IOP
    const orientationMatch = this.findViewportWithMatchingOrientation(
      metadata,
      displaySetInstanceUID,
      viewportType
    );
    if (orientationMatch) {
      return orientationMatch;
    }

    // 5. Fallback: Use the active viewport
    return {
      viewportId: activeViewportId,
      displaySetInstanceUID,
      viewportOptions: { viewportType },
    };
  }

  /**
   * Determines if the viewport should be what is specified in
   * the viewportType of the display set, or stack if the display
   * set isn't reconstructable and there is a referenced image id, otherwise
   * volume.
   *
   * Expect there to be more rules in the future for different types of annotations/settings
   * such as 3d annotations.
   */
  public determineTargetViewportType(displaySet, metadata): string {
    let { viewportType } = displaySet;

    if (!viewportType) {
      if (metadata.referencedImageId && !displaySet.isReconstructable) {
        viewportType = 'stack';
      } else if (metadata.volumeId) {
        viewportType = 'volume';
      }
    }
    return viewportType;
  }

  /**
   * Find viewports that could be updated to be volumes to show this view.
   * Prefers a viewport already showing the right display set.
   */
  public findViewportShowingVolume(metadata, displaySetInstanceUID, viewportType) {
    if (!metadata.volumeId) {
      return null;
    }

    for (const id of this.viewportsById.keys()) {
      const viewport = this.getCornerstoneViewport(id);
      if (viewport?.isReferenceViewable(metadata, { asVolume: true, withNavigation: true })) {
        return {
          viewportId: id,
          displaySetInstanceUID,
          viewportOptions: { viewportType },
        };
      }
    }
    return null;
  }

  /**
   * Find a viewport that could be converted to a volume to show this annotation,
   * already showing the right display set.
   */
  public findViewportConvertibleToVolume(metadata, displaySetInstanceUID, viewportType) {
    const { viewportGridService } = this.servicesManager.services;
    const altMetadata = { ...metadata, volumeId: null, referencedImageId: null };

    for (const id of this.viewportsById.keys()) {
      const viewport = this.getCornerstoneViewport(id);
      const viewportDisplaySetUID = viewportGridService.getDisplaySetsUIDsForViewport(id)?.[0];

      if (!viewportDisplaySetUID || !viewport) {
        continue;
      }

      if (metadata.volumeId) {
        altMetadata.volumeId = this._getVolumeId(viewportDisplaySetUID);
      }
      altMetadata.FrameOfReferenceUID = this._getFrameOfReferenceUID(viewportDisplaySetUID);

      if (viewport.isReferenceViewable(altMetadata, { asVolume: true, withNavigation: true })) {
        return {
          viewportId: id,
          displaySetInstanceUID,
          viewportOptions: { viewportType },
        };
      }
    }
    return null;
  }

  /**
   * Find a viewport with the closest orientation but on a different display set.
   */
  public findViewportWithMatchingOrientation(metadata, displaySetInstanceUID, viewportType) {
    const viewportAlignmentData = this.getViewportAlignmentData(metadata);
    if (viewportAlignmentData?.length) {
      return {
        ...viewportAlignmentData[0],
        displaySetInstanceUID,
        viewportOptions: { viewportType },
      };
    }
    return null;
  }

  /**
   * Sets the image data for the given viewport.
   */
  async _setEcgViewport(viewport: ECGViewport, viewportData: StackViewportData): Promise<void> {
    const [displaySet] = viewportData.data;
    const imageId = displaySet.imageIds?.[0];
    if (!imageId) {
      console.error('[CornerstoneViewportService] ECG display set has no imageId');
      return;
    }

    try {
      this.viewportsDisplaySets.set(viewport.id, [displaySet.displaySetInstanceUID]);
      await viewport.setDisplaySets({ displaySetId: displaySet.displaySetInstanceUID });
    } catch (error) {
      // Tell the user, then reject so that setViewportData does not report a successful mount.
      this.servicesManager.services.uiNotificationService?.show({
        title: 'ECG',
        message: 'The ECG waveform could not be loaded.',
        type: 'error',
      });
      throw error;
    }
  }

  /**
   * Video and whole slide viewports: mount the display set by its UID. The
   * video viewport reads the image id of the registered display set (the
   * image id of its `instance`); the whole slide viewport reads its imageIds
   * and the DICOMweb client that the SOP class handler registered as the
   * WADO_WEB_CLIENT metadata of its first image.
   */
  async _setOtherViewport(
    viewport: Types.IViewport,
    viewportData: StackViewportData,
    viewportInfo: ViewportInfo,
    _presentations: Presentations = {}
  ): Promise<void> {
    const [displaySet] = viewportData.data;

    this.viewportsDisplaySets.set(viewport.id, [displaySet.displaySetInstanceUID]);
    await viewport.setDisplaySets({ displaySetId: displaySet.displaySetInstanceUID });

    const viewReference = viewportInfo.getViewReference();
    if (viewReference) {
      viewport.setViewReference(viewReference);
    }
  }

  /**
   * Mounts a stack: the first image from the position presentation, the view
   * reference or the hanging protocol, the appearance from the stored LUT
   * presentation or the display set options. Then it replays the position and
   * the segmentation presentations: a hydrated overlay (RTSTRUCT contour, SEG
   * labelmap) is no longer in the display sets of the viewport after the
   * hydration, so without the replay it would vanish on this re-mount. The
   * stack starts on the image of its view reference, so the replay gives back
   * the framing and does not set that view reference a second time.
   */
  async _setStackViewport(
    viewport: Types.IViewport,
    viewportData: StackViewportData,
    viewportInfo: ViewportInfo,
    presentations: Presentations = {}
  ): Promise<void> {
    const displaySetOptions = viewportInfo.getDisplaySetOptions();

    const displaySetInstanceUIDs = viewportData.data.map(data => data.displaySetInstanceUID);

    // based on the cache service construct always the first one is the non-overlay
    // and the rest are overlays

    this.viewportsDisplaySets.set(viewport.id, [...displaySetInstanceUIDs]);

    const { initialImageIndex, imageIds } = viewportData.data[0];

    // Use the slice index from any provided view reference, as the view reference
    // is being used to navigate to the initial view position for measurement
    // navigation and other navigation forcing specific views.
    let initialImageIndexToUse =
      presentations?.positionPresentation?.initialImageIndex ?? (initialImageIndex as number);

    const { rotation, flipHorizontal, displayArea } = viewportInfo.getViewportOptions();

    const properties =
      presentations.lutPresentation?.appearances?.[displaySetInstanceUIDs[0]] ??
      getDisplaySetOptionsAppearance(displaySetOptions[0]);

    const overlayProcessingResults = this._processExtraDisplaySetsForViewport(viewport);

    const referencedImageId = presentations?.positionPresentation?.viewReference?.referencedImageId;
    if (referencedImageId && imageIds) {
      initialImageIndexToUse = imageIds.indexOf(referencedImageId);
    }

    if (
      initialImageIndexToUse === undefined ||
      initialImageIndexToUse === null ||
      initialImageIndexToUse < 0
    ) {
      initialImageIndexToUse = this._getInitialImageIndexForViewport(viewportInfo, imageIds) || 0;
    }

    if (!imageIds?.length) {
      return;
    }

    await mountStack(viewport, {
      displaySetInstanceUID: displaySetInstanceUIDs[0],
      initialImageIndex: initialImageIndexToUse,
      appearance: properties,
      displayArea,
      rotation,
      flipHorizontal,
    });

    if (presentations?.positionPresentation || presentations?.segmentationPresentation) {
      this.setPresentations(viewport.id, {
        positionPresentation: withoutShownViewReference(
          viewport,
          presentations.positionPresentation
        ),
        segmentationPresentation: presentations.segmentationPresentation,
      });
    }

    await this._addOverlayRepresentations(overlayProcessingResults);
  }

  private _getInitialImageIndexForViewport(
    viewportInfo: ViewportInfo,
    imageIds?: string[]
  ): number {
    const initialImageOptions = viewportInfo.getInitialImageOptions();
    if (!initialImageOptions) {
      return;
    }
    const { index, preset } = initialImageOptions;
    const dataShape = viewportInfo.getDataShape();

    let numberOfSlices;
    if (dataShape === 'stack') {
      numberOfSlices = imageIds.length;
    } else if (dataShape === 'volume') {
      const viewport = this.getCornerstoneViewport(viewportInfo.getViewportId()) as PlanarViewport;

      if (!viewport) {
        return;
      }

      numberOfSlices = viewport.getNumberOfSlices();
    } else {
      return;
    }

    return this._getInitialImageIndex(numberOfSlices, index, preset);
  }

  /**
   * The initial slice of a hanging protocol: the index, clipped to the
   * slices, or the slice of the preset. The 'middle' preset is the slice that
   * Cornerstone3D opens a volume view on, `floor(N / 2)` counted along the
   * view, and the slice that the Reset button takes a volume view back to
   * (`viewportOperations.getMiddleSliceIndex`), so a pane that opened on it
   * comes back to it.
   */
  _getInitialImageIndex(numberOfSlices: number, imageIndex?: number, preset?: JumpPresets): number {
    const lastSliceIndex = numberOfSlices - 1;

    if (imageIndex !== undefined) {
      return csUtils.clip(imageIndex, 0, lastSliceIndex);
    }

    if (preset === JumpPresets.First) {
      return 0;
    }

    if (preset === JumpPresets.Last) {
      return lastSliceIndex;
    }

    if (preset === JumpPresets.Middle) {
      return viewportOperations.getMiddleSliceIndex(numberOfSlices);
    }

    return 0;
  }

  async _setVolumeViewport(
    viewport: Types.IViewport,
    viewportData: VolumeViewportData,
    viewportInfo: ViewportInfo,
    presentations: Presentations = {}
  ): Promise<void> {
    // TODO: We need to overhaul the way data sources work so requests can be made
    // async. I think we should follow the image loader pattern which is async and
    // has a cache behind it.
    // The problem is that to set this volume, we need the metadata, but the request is
    // already in-flight, and the promise is not cached, so we have no way to wait for
    // it and know when it has fully arrived.
    // loadStudyMetadata(StudyInstanceUID) => Promise([instances for study])
    // loadSeriesMetadata(StudyInstanceUID, SeriesInstanceUID) => Promise([instances for series])
    // If you call loadStudyMetadata and it's not in the DicomMetadataStore cache, it should fire
    // a request through the data source?
    // (This call may or may not create sub-requests for series metadata)
    const { displaySetService } = this.servicesManager.services;
    const volumeInputArray = [];
    const displaySetOptionsArray = viewportInfo.getDisplaySetOptions();
    const { hangingProtocolService } = this.servicesManager.services;

    const volumeToLoad = [];
    const displaySetInstanceUIDs = [];

    for (const [index, data] of viewportData.data.entries()) {
      const { imageIds, displaySetInstanceUID } = data;
      let volume = data.volume;

      const displaySet = displaySetService.getDisplaySetByUID(displaySetInstanceUID);
      if (!volume && displaySet.images) {
        volume = csToolsUtils.getOrCreateImageVolume(displaySet.images.map(image => image.imageId));
      }

      displaySetInstanceUIDs.push(displaySetInstanceUID);

      if (!volume) {
        console.log('Volume display set not found');
        continue;
      }

      volumeToLoad.push(volume);

      const displaySetOptions = displaySetOptionsArray[index];
      const { volumeId } = volume;
      volumeInputArray.push({
        imageIds,
        volumeId,
        modality: displaySet.Modality,
        displaySetInstanceUID,
        blendMode: displaySetOptions.blendMode,
        slabThickness: this._getSlabThickness(displaySetOptions, volumeId),
      });
    }

    this.viewportsDisplaySets.set(viewport.id, displaySetInstanceUIDs);

    const volumesNotLoaded = volumeToLoad.filter(volume => !volume.loadStatus?.loaded);
    if (volumesNotLoaded.length) {
      if (hangingProtocolService.getShouldPerformCustomImageLoad()) {
        // delegate the volume loading to the hanging protocol service if it has a custom image load strategy
        return hangingProtocolService.runImageLoadStrategy({
          viewportId: viewport.id,
          volumeInputArray,
        });
      }

      volumesNotLoaded.forEach(volume => {
        if (!volume.loadStatus?.loading && volume.load instanceof Function) {
          volume.load();
        }
      });
    }

    // It's crucial not to return here because the volume may be loaded,
    // but the viewport also needs to set the volume.
    // if (!volumesNotLoaded.length) {
    //   return;
    // }

    // This returns the async continuation only
    return this.setVolumesForViewport(viewport, volumeInputArray, presentations);
  }

  /**
   * Mounts the volumes of a planar or a 3D viewport. A pane of a camera
   * position sync group does not drive the group while it mounts. A pane
   * that ranks after the panes of its groups placed so far starts at their
   * position (`getCameraPositionGroupStart`, the `initialViewReference` of the
   * mount), so it draws no other slice first; a pane that ranks before them
   * mounts on its own initial slice and takes them to it
   * (`placeInCameraPositionGroups`). The panes open on one slice whatever the
   * order of their mounts.
   */
  public async setVolumesForViewport(viewport, volumeInputArray, presentations) {
    const synchronizers = this._getCameraPositionSynchronizers(viewport.id);
    const held = holdCameraPositionSync(viewport, synchronizers);
    const groupContext = {
      synchronizers,
      getViewport: viewportId => this.getCornerstoneViewport(viewportId),
      getLayoutIndex: viewportId => this._getLayoutIndex(viewportId),
      getSliceStep: getViewSliceStep,
    };
    const mountedVolumeIds = volumeInputArray
      .filter(volumeInput => this._isMountedVolumeInput(volumeInput))
      .map(({ volumeId }) => volumeId);
    const groupStart = presentations?.positionPresentation
      ? undefined
      : getCameraPositionGroupStart(
          viewport.id,
          viewPlaneNormal => getMountSliceStep(mountedVolumeIds, viewPlaneNormal),
          groupContext
        );

    try {
      await this._mountVolumesForViewport(viewport, volumeInputArray, presentations, groupStart);
    } catch (error) {
      driveCameraPositionSync(viewport, held);
      throw error;
    }

    if (this.getCornerstoneViewport(viewport.id) !== viewport) {
      driveCameraPositionSync(viewport, held);
      return;
    }

    placeInCameraPositionGroups(
      viewport,
      held,
      groupContext,
      Boolean(presentations?.positionPresentation)
    );
  }

  /**
   * Whether a volume input of a mount is mounted as a volume of the viewport:
   * an overlay display set (a segmentation) is added by the segmentation
   * service instead.
   */
  private _isMountedVolumeInput(volumeInput): boolean {
    const { displaySetService } = this.servicesManager.services;
    const displaySet = displaySetService.getDisplaySetByUID(volumeInput.displaySetInstanceUID);
    return !displaySet?.isOverlayDisplaySet;
  }

  /** The camera position synchronizers that the sync groups of a pane name. */
  private _getCameraPositionSynchronizers(viewportId: string): Synchronizer[] {
    const { syncGroupService } = this.servicesManager.services;
    const syncGroups = this.getViewportInfo(viewportId)?.getSyncGroups() ?? [];

    return getCameraPositionSyncGroupIds(syncGroups)
      .map(id => syncGroupService.getSynchronizer(id))
      .filter(Boolean) as Synchronizer[];
  }

  /** The place of a pane in the layout of the viewport grid. */
  private _getLayoutIndex(viewportId: string): number {
    const { viewportGridService } = this.servicesManager.services;
    const viewportIds = [...(viewportGridService.getState()?.viewports?.keys() ?? [])];
    const index = viewportIds.indexOf(viewportId);

    return index === -1 ? viewportIds.length : index;
  }

  /**
   * Mounts the volumes of a viewport, its source at the view reference of its
   * position presentation, else at the position of its camera position group
   * (`groupStart`), else on its initial slice. A stored position gives back
   * its framing after the mount, and its view reference only when the mount
   * could not start at it; a pane that starts at the position of its group
   * does not jump to the initial image of its hanging protocol.
   */
  private async _mountVolumesForViewport(
    viewport,
    volumeInputArray,
    presentations,
    groupStart?: Types.ViewReference
  ) {
    const { displaySetService, viewportGridService } = this.servicesManager.services;

    const viewportInfo = this.getViewportInfo(viewport.id);
    const displaySetOptions = viewportInfo.getDisplaySetOptions();
    const displaySetUIDs = viewportGridService.getDisplaySetsUIDsForViewport(viewport.id);
    const displaySet = displaySetService.getDisplaySetByUID(displaySetUIDs[0]);
    const displaySetModality = displaySet?.Modality;

    // seems like a hack but we need the actor to be ready first before
    // we set the properties
    const timeoutViewportCallback = (callback: () => void) => setTimeout(callback, 0);

    // filter overlay display sets (e.g. segmentation) since they will get handled below via the segmentation service
    const filteredVolumeInputArray = volumeInputArray
      .map((volumeInput, index) => {
        return { volumeInput, displaySetOptions: displaySetOptions[index] };
      })
      .filter(({ volumeInput }) => this._isMountedVolumeInput(volumeInput));

    // Todo: use presentations states
    const volumesProperties = filteredVolumeInputArray.map(({ volumeInput, displaySetOptions }) => {
      const { volumeId } = volumeInput;
      const { displayPreset } = displaySetOptions;
      const properties = getDisplaySetOptionsAppearance(displaySetOptions);

      if (displayPreset !== undefined) {
        properties.preset = displayPreset[displaySetModality] || displayPreset.default;
      }

      return { properties, volumeId };
    });

    // For SEG and RT viewports
    const overlayProcessingResults = this._processExtraDisplaySetsForViewport(viewport) || [];

    if (filteredVolumeInputArray.length) {
      await mountVolumes(viewport, {
        filteredVolumeInputArray,
        volumesProperties,
        orientation: viewportInfo.getOrientation(),
        lutPresentation: presentations?.lutPresentation,
        initialViewReference:
          getPositionViewReference(presentations?.positionPresentation) ?? groupStart,
      });
      await this._addOverlayRepresentations(overlayProcessingResults);
      viewport.render();

      if (presentations?.positionPresentation || presentations?.segmentationPresentation) {
        this.setPresentations(viewport.id, {
          positionPresentation: withoutShownViewReference(
            viewport,
            presentations.positionPresentation
          ),
          segmentationPresentation: presentations.segmentationPresentation,
        });
      }

      if (!groupStart) {
        this._jumpToInitialImage(viewport, viewportInfo, presentations);
      }
      return;
    }

    if (!filteredVolumeInputArray.length && overlayProcessingResults?.length) {
      overlayProcessingResults.forEach(({ imageIds, addOverlayFn }) => {
        if (addOverlayFn) {
          // if there is no volume input array, and there is an addOverlayFn, means we need to take
          // care of the background overlay display set first then the addOverlayFn will add the
          // SEG displaySet
          const sampleImageId = imageIds[0];
          const backgroundDisplaySet = displaySetService.getDisplaySetsBy(
            displaySet =>
              !displaySet.isOverlayDisplaySet &&
              displaySet.images?.some(image => image.imageId === sampleImageId)
          );

          if (backgroundDisplaySet.length !== 1) {
            throw new Error('Background display set not found');
          }

          if (isVolumeViewport3D(viewport)) {
            timeoutViewportCallback(() => {
              viewportGridService.setDisplaySetsForViewport({
                viewportId: viewport.id,
                displaySetInstanceUIDs: [backgroundDisplaySet[0].displaySetInstanceUID],
              });
            });
          }
        }
      });
    }

    await this._addOverlayRepresentations(overlayProcessingResults);
    viewport.render();

    this.setPresentations(viewport.id, presentations);
    viewport.render();

    this._jumpToInitialImage(viewport, viewportInfo, presentations);
  }

  /**
   * Puts a volume viewport on the initial image of its hanging protocol
   * (`initialImageOptions`: an index or a preset), after its volumes are
   * mounted. A viewport that comes back with a position presentation keeps the
   * position that the presentation restored.
   */
  private _jumpToInitialImage(
    viewport: Types.IViewport,
    viewportInfo: ViewportInfo,
    presentations?: Presentations
  ): void {
    if (presentations?.positionPresentation) {
      return;
    }

    const imageIndex = this._getInitialImageIndexForViewport(viewportInfo);

    if (imageIndex !== undefined) {
      csUtils.jumpToSlice(viewport.element, {
        imageIndex,
      });
    }
  }

  private _processExtraDisplaySetsForViewport(viewport: Types.IViewport) {
    const { displaySetService } = this.servicesManager.services;

    // load any secondary displaySets
    const displaySetInstanceUIDs = this.viewportsDisplaySets.get(viewport.id);

    // Find overlay display sets (e.g. SEG, RTSTRUCT)
    const overlayDisplaySets = displaySetInstanceUIDs
      .map(displaySetService.getDisplaySetByUID)
      .filter(displaySet => displaySet?.isOverlayDisplaySet);

    // if it is only the overlay displaySet, then we need to get the reference
    // displaySet imageIds and set them as the imageIds for the viewport,
    // here we can do some logic if the reference is missing
    // then find the most similar match of displaySet instead
    if (!overlayDisplaySets?.length) {
      return;
    }

    return overlayDisplaySets.map(overlayDisplaySet => {
      let imageIds;
      if (overlayDisplaySet.referencedDisplaySetInstanceUID) {
        const referenceDisplaySet = displaySetService.getDisplaySetByUID(
          overlayDisplaySet.referencedDisplaySetInstanceUID
        );
        imageIds = referenceDisplaySet.images.map(image => image.imageId);
      }
      return {
        imageIds,
        addOverlayFn: () => this.addOverlayRepresentationForDisplaySet(overlayDisplaySet, viewport),
      };
    });
  }

  private addOverlayRepresentationForDisplaySet(
    displaySet: OhifTypes.DisplaySet,
    viewport: Types.IViewport
  ): Promise<void> {
    const { segmentationService } = this.servicesManager.services;
    const segmentationId = displaySet.displaySetInstanceUID;

    const representationType =
      displaySet.Modality === 'SEG'
        ? csToolsEnums.SegmentationRepresentations.Labelmap
        : csToolsEnums.SegmentationRepresentations.Contour;

    const applyRepresentation = () => {
      const { predecessorImageId } = displaySet;
      const segmentationRepresentationPromise = segmentationService.addSegmentationRepresentation(
        viewport.id,
        {
          segmentationId,
          predecessorImageId,
          type: representationType,
          config: {
            blendMode:
              getPlanarOr3DViewport(viewport)?.getDisplaySetAppearance()?.blendMode ===
              BlendModes.MAXIMUM_INTENSITY_BLEND
                ? BlendModes.LABELMAP_EDGE_PROJECTION_BLEND
                : undefined,
          },
        }
      );
      this.storePresentation({ viewportId: viewport.id });
      return segmentationRepresentationPromise;
    };

    // SEG overlay is registered during stack setup, but cornerstone segmentation state
    // is created in displaySet.load() (async). Wait until it exists before adding representation.
    if (displaySet.Modality === 'SEG') {
      if (segmentationService.getSegmentation(segmentationId)) {
        return applyRepresentation();
      }

      // Bound the wait so a failed/aborted SEG load (where SEGMENTATION_LOADING_COMPLETE
      // never fires) cannot leave this promise — and the viewport setup awaiting it —
      // hanging indefinitely.
      const SEG_LOADING_TIMEOUT_MS = 120000;

      return new Promise<void>(resolve => {
        let settled = false;
        let timeoutId;

        // Final resolution — extra calls are harmless (resolve is a no-op after
        // the first), which lets the timeout stay armed while a representation
        // apply is in flight and still bound it.
        const finish = () => {
          clearTimeout(timeoutId);
          resolve();
        };

        // Give up without applying (load failure / timeout before the event).
        const settleWithoutApply = () => {
          settled = true;
          unsubscribe();
          finish();
        };

        const { unsubscribe } = segmentationService.subscribe(
          segmentationService.EVENTS.SEGMENTATION_LOADING_COMPLETE,
          async (evt: { segDisplaySet?: OhifTypes.DisplaySet }) => {
            if (settled || evt.segDisplaySet?.displaySetInstanceUID !== segmentationId) {
              return;
            }

            // Dedupe immediately, but resolve only after the representation is
            // applied: awaiters continue into rotation/flip/render and broadcast
            // VIEWPORT_DATA_CHANGED (hanging-protocol callbacks, toolbar, e2e
            // readiness), which must not observe a viewport whose overlay
            // doesn't exist yet. applyRepresentation can be genuinely async
            // (stack→volume viewport conversion). The timeout is deliberately
            // NOT cleared here — a hung apply stays bounded.
            settled = true;
            unsubscribe();

            try {
              await applyRepresentation();
            } catch (error) {
              console.warn(
                `Failed to apply segmentation representation for "${segmentationId}":`,
                error
              );
            } finally {
              finish();
            }
          }
        );

        // Stop waiting immediately if the SEG load itself fails — otherwise the
        // loading-complete event never fires and we would idle until the timeout.
        const loadingPromise = (displaySet as { loadingPromise?: Promise<unknown> }).loadingPromise;
        loadingPromise?.catch(error => {
          if (settled) {
            return;
          }

          console.warn(
            `Segmentation "${segmentationId}" failed to load; skipping representation setup.`,
            error
          );
          settleWithoutApply();
        });

        timeoutId = setTimeout(() => {
          if (settled) {
            // The load completed but applyRepresentation is hung — resolve so
            // viewport setup is never blocked past the bound (best-effort
            // semantics; the apply may still land later).
            console.warn(
              `Timed out applying segmentation representation for "${segmentationId}"; resolving viewport readiness anyway.`
            );
            resolve();
            return;
          }

          console.warn(
            `Timed out waiting for segmentation "${segmentationId}" to load; skipping representation setup.`
          );
          settleWithoutApply();
        }, SEG_LOADING_TIMEOUT_MS);
      });
    }

    return applyRepresentation();
  }

  async _addOverlayRepresentations(
    overlayProcessingResults?: Array<{ addOverlayFn?: () => Promise<void> }>
  ): Promise<void> {
    if (!overlayProcessingResults?.length) {
      return;
    }
    for (const overlayProcessingResult of overlayProcessingResults) {
      if (overlayProcessingResult?.addOverlayFn) {
        await overlayProcessingResult.addOverlayFn();
      }
    }
  }

  // Todo: keepCamera is an interim solution until we have a better solution for
  // keeping the camera position when the viewport data is changed
  public updateViewport(viewportId: string, viewportData, keepCamera = false) {
    const viewportInfo = this.getViewportInfo(viewportId);
    const viewport = this.getCornerstoneViewport(viewportId);
    const viewState = keepCamera ? viewport.getViewState() : undefined;

    const displaySetPromise = this._setDisplaySets(viewport, viewportData, viewportInfo).then(
      () => {
        if (keepCamera && viewState) {
          viewport.setViewState(viewState);
          viewport.render();
        }
      }
    );

    displaySetPromise.then(
      () => {
        this._broadcastEvent(this.EVENTS.VIEWPORT_DATA_CHANGED, {
          viewportData,
          viewportId,
        });
      },
      error => console.error('[CornerstoneViewportService] Failed to update the viewport', error)
    );
  }

  /**
   * Routes a viewport's data to the mount of its family: video, whole slide
   * and ECG by the viewport type, a stack and a volume by the shape of the
   * data (the dataShapeType that CornerstoneCacheService stores), because a
   * planar viewport shows both.
   */
  _setDisplaySets(
    viewport: Types.IViewport,
    viewportData: StackViewportData | VolumeViewportData,
    viewportInfo: ViewportInfo,
    presentations: Presentations = {}
  ): Promise<void> {
    if (isECGViewport(viewport)) {
      return this._setEcgViewport(viewport, viewportData as StackViewportData);
    }

    if (
      viewport.type === csEnums.ViewportType.VIDEO ||
      viewport.type === csEnums.ViewportType.WHOLE_SLIDE
    ) {
      return this._setOtherViewport(
        viewport,
        viewportData as StackViewportData,
        viewportInfo,
        presentations
      );
    }

    const dataShape = getViewportDataShape(viewportData);

    if (dataShape === 'volume' || dataShape === 'volume3d') {
      return this._setVolumeViewport(
        viewport,
        viewportData as VolumeViewportData,
        viewportInfo,
        presentations
      );
    }

    return this._setStackViewport(
      viewport,
      viewportData as StackViewportData,
      viewportInfo,
      presentations
    );
  }

  /**
   * Removes the resize observer from the viewport element
   */
  _removeResizeObserver() {
    if (this.viewportGridResizeObserver) {
      this.viewportGridResizeObserver.disconnect();
    }
  }

  _getSlabThickness(displaySetOptions, volumeId) {
    const { blendMode } = displaySetOptions;
    if (blendMode === undefined || displaySetOptions.slabThickness === undefined) {
      return;
    }

    // if there is a slabThickness set as a number then use it
    if (typeof displaySetOptions.slabThickness === 'number') {
      return displaySetOptions.slabThickness;
    }

    if (displaySetOptions.slabThickness.toLowerCase() === 'fullvolume') {
      // calculate the slab thickness based on the volume dimensions
      const imageVolume = cache.getVolume(volumeId);

      const { dimensions, spacing } = imageVolume;
      const slabThickness = Math.sqrt(
        Math.pow(dimensions[0] * spacing[0], 2) +
          Math.pow(dimensions[1] * spacing[1], 2) +
          Math.pow(dimensions[2] * spacing[2], 2)
      );

      return slabThickness;
    }
  }

  /**
   * The id of the volume that a display set is shown as: the volume loader of the
   * display set, or the default one, and its display set instance UID.
   */
  _getVolumeId(displaySetInstanceUID: string): string {
    const { displaySetService } = this.servicesManager.services;
    const displaySet = displaySetService.getDisplaySetByUID(displaySetInstanceUID);
    const volumeLoaderSchema = displaySet?.volumeLoaderSchema ?? VOLUME_LOADER_SCHEME;

    return `${volumeLoaderSchema}:${displaySetInstanceUID}`;
  }

  _getFrameOfReferenceUID(displaySetInstanceUID) {
    const { displaySetService } = this.servicesManager.services;
    const displaySet = displaySetService.getDisplaySetByUID(displaySetInstanceUID);

    if (!displaySet) {
      return;
    }

    if (displaySet.FrameOfReferenceUID) {
      return displaySet.FrameOfReferenceUID;
    }

    if (displaySet.Modality === 'SEG') {
      const { instance } = displaySet;
      return instance.FrameOfReferenceUID;
    }

    if (displaySet.Modality === 'RTSTRUCT') {
      const { instance } = displaySet;
      return instance.ReferencedFrameOfReferenceSequence.FrameOfReferenceUID;
    }

    const { images } = displaySet;
    if (images && images.length) {
      return images[0].FrameOfReferenceUID;
    }
  }

  private enqueueViewportResizeRequest() {
    this.resizeQueue.push(false); // false indicates viewport resize

    clearTimeout(this.viewportResizeTimer);
    this.viewportResizeTimer = setTimeout(() => {
      this.processViewportResizeQueue();
    }, this.gridResizeDelay);
  }

  private processViewportResizeQueue() {
    const isGridResizeInQueue = this.resizeQueue.some(isGridResize => isGridResize);
    if (this.resizeQueue.length > 0 && !isGridResizeInQueue && !this.gridResizeTimeOut) {
      this.performResize();
    }

    // Clear the queue after processing viewport resizes
    this.resizeQueue = [];
  }

  /**
   * Resizes the rendering engine and gives each viewport its framing back (the
   * zoom and the pan against the fit), so a view that fit its pane fits the
   * pane of the new size. A resize keeps the slice and the orientation of each
   * viewport (Cornerstone3D keeps the camera), so the view reference is not
   * written again: it would move a pane that sits between two of its slices,
   * as a PET pane on the position of a CT, to the centre of its slice.
   */
  private performResize() {
    const isImmediate = false;

    try {
      const viewports = this.getRenderingEngine().getViewports();

      viewports.forEach(({ id: viewportId }) => {
        const presentation = this._getPositionPresentation(viewportId);
        this.beforeResizePositionPresentations.set(viewportId, {
          ...presentation,
          viewReference: undefined,
        });
      });

      // Resize the rendering engine and render.
      const renderingEngine = this.renderingEngine;
      renderingEngine.resize(isImmediate);
      renderingEngine.render();

      // Reset the camera for all viewports using position presentation to maintain relative size/position
      // which means only those viewports that have a zoom level of 1.
      this.beforeResizePositionPresentations.forEach((positionPresentation, viewportId) => {
        this.setPresentations(viewportId, {
          positionPresentation,
        });
      });

      // Resize and render the rendering engine again.
      renderingEngine.resize(isImmediate);
      renderingEngine.render();
    } catch (e) {
      // This can happen if the resize is too close to navigation or shutdown
      console.warn('Caught resize exception', e);
    }
  }

  private resetGridResizeTimeout() {
    clearTimeout(this.gridResizeTimeOut);
    this.gridResizeTimeOut = setTimeout(() => {
      this.gridResizeTimeOut = null;
    }, this.gridResizeDelay);
  }

  private _setSegmentationPresentation(
    viewport: Types.IViewport,
    segmentationPresentation: SegmentationPresentation
  ): void {
    if (!segmentationPresentation) {
      return;
    }

    const { segmentationService, customizationService, viewportGridService } =
      this.servicesManager.services;

    // A site can narrow which viewport types a hydrated segmentation appears in
    // automatically (surface generation for a 3D viewport being the expensive
    // case). This gates only the automatic add - an explicit add from the
    // overlay menu goes through addSegmentationRepresentation directly.
    //
    // The type comes from the grid, not from ViewportInfo: the customization is
    // written in OHIF viewport types and getUpdatedViewportsForSegmentation
    // reads the same field, so one configured list means the same thing in both
    // places. ViewportInfo holds the cornerstone type, which is 'planar' for
    // stack and MPR alike.
    const autoHydrateAllowed = isAutoHydrateViewportType({
      viewportType: viewportGridService.getState().viewports.get(viewport.id)?.viewportOptions
        ?.viewportType,
      customizationService,
    });

    // Display sets the viewport carries as explicit layers. Those are added by
    // _addOverlayRepresentations as part of this same mount, and the two run in
    // opposite orders on the stack and volume paths, so a stored `hydrated:
    // false` must not remove one of them - being listed in the viewport is the
    // more specific statement, and it is what the overlay menu's per-viewport
    // Add records.
    const explicitLayerUIDs = new Set(this.viewportsDisplaySets.get(viewport.id) || []);

    segmentationPresentation.forEach((presentationItem: SegmentationPresentationItem) => {
      const { segmentationId, type, hydrated } = presentationItem;

      const { Labelmap, Surface } = csToolsEnums.SegmentationRepresentations;
      const isVolume3D = isVolumeViewport3D(viewport);

      // The stored type is a hint: it was recorded when the segmentation was
      // hydrated, possibly against a viewport of a different kind than this
      // one, or with no viewport at all. Surface only renders in a 3D viewport
      // and a 3D viewport renders a labelmap as a surface, so correct in both
      // directions here. Being tolerant of the stored value is what lets the
      // hydration path record a type without needing a live viewport.
      let representationType = type;

      if (type === Surface && !isVolume3D) {
        representationType = Labelmap;
      } else if (type === Labelmap && isVolume3D) {
        representationType = Surface;
      }

      if (hydrated && autoHydrateAllowed) {
        segmentationService.addSegmentationRepresentation(viewport.id, {
          segmentationId,
          type: representationType,
          config: {
            blendMode:
              getPlanarOr3DViewport(viewport)?.getDisplaySetAppearance()?.blendMode ===
              BlendModes.MAXIMUM_INTENSITY_BLEND
                ? BlendModes.LABELMAP_EDGE_PROJECTION_BLEND
                : undefined,
          },
        });
        return;
      }

      // hydrated === false means this segmentation was explicitly removed from
      // the presentation (closed from the segmentation panel, or the layer
      // removed). Converge the viewport on the stored state instead of only
      // ever adding, so a re-created viewport does not restore a segmentation
      // the user dismissed. hydrated == null is "no representation yet" and is
      // deliberately left alone.
      if (hydrated === false && !explicitLayerUIDs.has(segmentationId)) {
        segmentationService.removeRepresentationsFromViewport(viewport.id, {
          segmentationId,
        });
      }
    });
  }

  /**
   * Gets the display sets for a given viewport
   * @param viewportId - The ID of the viewport to get display sets for
   * @returns Array of display sets for the viewport
   */
  public getViewportDisplaySets(viewportId: string): OhifTypes.DisplaySet[] {
    const { displaySetService } = this.servicesManager.services;
    const displaySetInstanceUIDs = this.viewportsDisplaySets.get(viewportId) || [];

    return displaySetInstanceUIDs
      .map(uid => displaySetService.getDisplaySetByUID(uid))
      .filter(Boolean);
  }
}

/**
 * The view that a pane had, at which a volume mount starts its source: the
 * view reference of its position presentation when that reference names its
 * frame of reference, as every view reference read from a viewport does. A
 * reference that names only an image (the first segmented slice that an RT
 * or SEG viewport gives a stack) is not a view of the pane: a volume viewport
 * does not start at it.
 */
function getPositionViewReference(
  positionPresentation?: PositionPresentation
): Types.ViewReference | undefined {
  const viewReference = positionPresentation?.viewReference;
  return viewReference?.FrameOfReferenceUID ? viewReference : undefined;
}

export default CornerstoneViewportService;
