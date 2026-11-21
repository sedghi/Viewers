import type { Types, PlanarViewport, ECGViewport } from '@cornerstonejs/core';
import type ViewportInfo from '../Viewport';
import type { Presentations } from '../../../types/Presentation';
import type { StackViewportData, VolumeViewportData } from '../../../types/CornerstoneCacheService';
import type { OverlayMountTask } from './IViewportBackend';

/**
 * The narrow slice of CornerstoneViewportService that the viewport backend is
 * allowed to reach. The service `implements` this and passes `this` to the
 * backend, so the backend can dispatch the per-family mount work back to the
 * service methods without reaching into unrelated internals.
 */
export interface IViewportServiceInternals {
  _setStackViewport(
    viewport: PlanarViewport,
    viewportData: StackViewportData,
    viewportInfo: ViewportInfo,
    presentations?: Presentations
  ): Promise<void>;

  _setVolumeViewport(
    viewport: PlanarViewport,
    viewportData: VolumeViewportData,
    viewportInfo: ViewportInfo,
    presentations?: Presentations
  ): Promise<void>;

  _setEcgViewport(viewport: ECGViewport, viewportData: StackViewportData): Promise<void>;

  _setOtherViewport(
    viewport: PlanarViewport,
    viewportData: StackViewportData,
    viewportInfo: ViewportInfo,
    presentations?: Presentations
  ): Promise<void>;

  /** Applies lut/position/segmentation presentations to a mounted viewport. */
  setPresentations(viewportId: string, presentations: Presentations): void;

  /** Runs the pending overlay (SEG/RTSTRUCT) adds produced by the mount prelude. */
  _addOverlayRepresentations(overlayProcessingResults?: OverlayMountTask[]): Promise<void>;

  /** Records which display sets a viewport shows (service bookkeeping). */
  _trackViewportDisplaySets(viewportId: string, displaySetInstanceUIDs: string[]): void;
}
