import { useSystem, utils } from '@ohif/core';
import React, { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { displaySetRegistry, getEnabledElement } from '@cornerstonejs/core';
import type { Types } from '@cornerstonejs/core';
import { ToolGroupManager, segmentation, Enums } from '@cornerstonejs/tools';
import { getEnabledElement as OHIFgetEnabledElement } from '../state';

const { downloadUrl } = utils;

const DEFAULT_SIZE = 512;
const VIEWPORT_ID = 'cornerstone-viewport-download-form';

const FILE_TYPE_OPTIONS = [
  {
    value: 'jpg',
    label: 'JPG',
  },
  {
    value: 'png',
    label: 'PNG',
  },
];

type ViewportDownloadFormProps = {
  hide: () => void;
  activeViewportId: string;
};

type SegmentationRepresentations = ReturnType<
  typeof segmentation.state.getViewportSegmentationRepresentations
>;

/**
 * Whether a display set that a viewport shows is the labelmap of a
 * segmentation: the tools register it with a reference of kind
 * 'segmentation'. The capture shows a segmentation through its
 * representation, not through this layer.
 */
function isSegmentationLayer(displaySetId: string): boolean {
  const reference = displaySetRegistry.get(displaySetId)?.reference as
    | { kind?: string }
    | undefined;

  return reference?.kind === 'segmentation';
}

/**
 * Shows on the capture viewport the view of the source viewport: its view
 * reference, then its framing. The framing is relative to the fit, so a
 * capture of another size shows the same part of the image.
 */
function showSourceView(viewport: Types.IViewport, downloadViewport: Types.IViewport): void {
  downloadViewport.setViewReference(viewport.getViewReference());

  const framing = viewport.getViewFraming();
  if (framing) {
    downloadViewport.setViewFraming(framing);
  }

  downloadViewport.render();
}

/**
 * Mounts on the capture viewport every display set of the source viewport
 * that is not the labelmap of a segmentation, each with the options of its
 * mount (mode, volume, role) and the appearance that a user set on it, shows
 * the view of the source, and adds the segmentation representations of the
 * source once.
 *
 * Module scope on purpose: the optional chaining inside this try/catch is a
 * React Compiler limitation ("value blocks within a try/catch") that bails the
 * whole component when inlined. Plain functions are never compiled.
 */
async function mountCaptureViewport(
  viewport: Types.IViewport,
  downloadViewport: Types.IViewport,
  segmentationRepresentations: SegmentationRepresentations | undefined
): Promise<void> {
  try {
    const layers = viewport
      .getDisplaySets()
      .filter(({ displaySetId }) => !isSegmentationLayer(displaySetId))
      .map(({ displaySetId, options }) => ({
        displaySetId,
        options: {
          ...(options as Record<string, unknown>),
          appearance: viewport.getDisplaySetAppearance(displaySetId) ?? {},
        },
      }));

    await downloadViewport.setDisplaySets(...layers);

    showSourceView(viewport, downloadViewport);

    segmentationRepresentations?.forEach(segRepresentation => {
      const { segmentationId, colorLUTIndex, type } = segRepresentation;

      if (type === Enums.SegmentationRepresentations.Labelmap) {
        segmentation.addLabelmapRepresentationToViewportMap({
          [downloadViewport.id]: [
            {
              segmentationId,
              type: Enums.SegmentationRepresentations.Labelmap,
              config: { colorLUTOrIndex: colorLUTIndex },
            },
          ],
        });
      }

      if (type === Enums.SegmentationRepresentations.Contour) {
        segmentation.addContourRepresentationToViewportMap({
          [downloadViewport.id]: [
            {
              segmentationId,
              type: Enums.SegmentationRepresentations.Contour,
              config: { colorLUTOrIndex: colorLUTIndex },
            },
          ],
        });
      }
    });
  } catch (error) {
    console.error('Error loading image:', error);
  }
}

const CornerstoneViewportDownloadForm = ({
  hide,
  activeViewportId: activeViewportIdProp,
}: ViewportDownloadFormProps) => {
  const { servicesManager } = useSystem();
  const { customizationService, cornerstoneViewportService } = servicesManager.services;
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [viewportDimensions, setViewportDimensions] = useState({
    width: DEFAULT_SIZE,
    height: DEFAULT_SIZE,
  });

  const warningState = customizationService.getCustomization('viewportDownload.warningMessage') as {
    enabled: boolean;
    value: string;
  };

  const refViewportEnabledElementOHIF = OHIFgetEnabledElement(activeViewportIdProp);
  const activeViewportElement = refViewportEnabledElementOHIF?.element;
  const { viewportId: activeViewportId, renderingEngineId } =
    getEnabledElement(activeViewportElement);

  const renderingEngine = cornerstoneViewportService.getRenderingEngine();
  const toolGroup = ToolGroupManager.getToolGroupForViewport(activeViewportId, renderingEngineId);
  const captureMount = useRef<{ viewport: Types.IViewport; mounted: Promise<void> } | null>(null);

  useEffect(() => {
    const toolModeAndBindings = Object.keys(toolGroup.toolOptions).reduce((acc, toolName) => {
      const tool = toolGroup.toolOptions[toolName];
      const { mode, bindings } = tool;

      return {
        ...acc,
        [toolName]: { mode, bindings },
      };
    }, {});

    return () => {
      Object.keys(toolModeAndBindings).forEach(toolName => {
        const { mode, bindings } = toolModeAndBindings[toolName];
        try {
          toolGroup.setToolMode(toolName, mode, { bindings });
        } catch (error) {
          // Handle errors when restoring tool mode during cleanup (e.g., when tool state is undefined)
          console.debug('Error restoring tool mode during cleanup:', toolName, error);
        }
      });
    };
  }, []);

  const handleEnableViewport = (viewportElement: HTMLElement) => {
    if (!viewportElement) {
      return;
    }

    const { viewport } = getEnabledElement(activeViewportElement);

    const viewportInput = {
      viewportId: VIEWPORT_ID,
      element: viewportElement,
      type: viewport.type,
      defaultOptions: {
        background: viewport.defaultOptions.background,
        orientation: viewport.defaultOptions.orientation,
      },
    };

    renderingEngine.enableElement(viewportInput);
  };

  const handleDisableViewport = async () => {
    renderingEngine.disableElement(VIEWPORT_ID);
  };

  const handleLoadImage = async () => {
    if (!activeViewportElement) {
      return;
    }

    const activeViewportEnabledElement = getEnabledElement(activeViewportElement);
    const downloadViewport = renderingEngine.getViewport(VIEWPORT_ID);
    if (!activeViewportEnabledElement || !downloadViewport) {
      return;
    }

    const { viewport } = activeViewportEnabledElement;

    if (captureMount.current?.viewport === downloadViewport) {
      await captureMount.current.mounted;
      showSourceView(viewport, downloadViewport);
      return;
    }

    const segmentationRepresentations =
      segmentation.state.getViewportSegmentationRepresentations(activeViewportId);
    const mounted = mountCaptureViewport(viewport, downloadViewport, segmentationRepresentations);

    captureMount.current = { viewport: downloadViewport, mounted };

    return mounted;
  };

  const handleToggleAnnotations = (show: boolean) => {
    const activeViewportEnabledElement = getEnabledElement(activeViewportElement);
    if (!activeViewportEnabledElement) {
      return;
    }

    const downloadViewport = renderingEngine.getViewport(VIEWPORT_ID);
    if (!downloadViewport) {
      return;
    }

    const { viewportId: activeViewportId, renderingEngineId } = activeViewportEnabledElement;
    const { id: downloadViewportId } = downloadViewport;

    const toolGroup = ToolGroupManager.getToolGroupForViewport(activeViewportId, renderingEngineId);
    toolGroup.addViewport(downloadViewportId, renderingEngineId);

    const toolInstances = toolGroup.getToolInstances();
    const toolInstancesArray = Object.values(toolInstances);

    toolInstancesArray.forEach(toolInstance => {
      if (toolInstance.constructor.isAnnotation !== false) {
        if (show) {
          toolGroup.setToolEnabled(toolInstance.toolName);
        } else {
          toolGroup.setToolDisabled(toolInstance.toolName);
        }
      }
    });
  };

  useEffect(() => {
    if (viewportDimensions.width && viewportDimensions.height) {
      setTimeout(() => {
        handleToggleAnnotations(showAnnotations);
        // we need a resize here to make suer annotations world to canvas
        // are properly calculated
        renderingEngine.resize();
        handleLoadImage();
        renderingEngine.render();
      }, 100);
    }
  }, [viewportDimensions, showAnnotations]);

  const handleDownload = async (baseFilename: string, fileType: string) => {
    const divForDownloadViewport = document.querySelector(
      `div[data-viewport-uid="${VIEWPORT_ID}"]`
    );

    if (!divForDownloadViewport) {
      console.debug('No viewport found for download');
      return;
    }

    const filename = `${baseFilename}.${fileType}`;
    const canvas = await html2canvas(divForDownloadViewport as HTMLElement);
    downloadUrl(canvas.toDataURL(`image/${fileType}`, 1.0), { filename });
  };

  const handleCopyToClipboard = async () => {
    const divForDownloadViewport = document.querySelector(
      `div[data-viewport-uid="${VIEWPORT_ID}"]`
    );

    if (!divForDownloadViewport) {
      console.debug('No viewport found for copy');
      return;
    }

    try {
      const canvas = await html2canvas(divForDownloadViewport as HTMLElement);

      // Clipboard API only supports PNG format in most browsers
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          blob => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob from canvas'));
            }
          },
          'image/png',
          1.0
        );
      });

      // Copy to clipboard using the Clipboard API
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob,
        }),
      ]);

      console.log('Image copied to clipboard successfully');
    } catch (error) {
      console.error('Failed to copy image to clipboard:', error);
      throw error;
    }
  };

  const ViewportDownloadFormNew = customizationService.getCustomization(
    'ohif.captureViewportModal'
  );

  return (
    <ViewportDownloadFormNew
      onClose={hide}
      defaultSize={DEFAULT_SIZE}
      fileTypeOptions={FILE_TYPE_OPTIONS}
      viewportId={VIEWPORT_ID}
      showAnnotations={showAnnotations}
      onAnnotationsChange={setShowAnnotations}
      dimensions={viewportDimensions}
      onDimensionsChange={setViewportDimensions}
      onEnableViewport={handleEnableViewport}
      onDisableViewport={handleDisableViewport}
      onDownload={handleDownload}
      onCopyToClipboard={handleCopyToClipboard}
      warningState={warningState}
    />
  );
};

export { mountCaptureViewport, showSourceView };
export default CornerstoneViewportDownloadForm;
