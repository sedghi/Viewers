import type { Types as CoreTypes } from '@cornerstonejs/core';

export type FlipValue = 'toggle' | boolean;
export type RotationMode = 'apply' | 'set';

export interface VolumeLightingOptions {
  shade?: boolean;
  ambient?: number;
  diffuse?: number;
  specular?: number;
}

export interface WindowLevelParams {
  windowWidth: number;
  windowCenter: number;
  /** The binding to change (e.g. the PT overlay in a fusion). The source binding when absent. */
  displaySetInstanceUID?: string;
}

export interface ColormapParams {
  colormap: Record<string, unknown>;
  /** The binding to change (e.g. the PT overlay in a fusion). The source binding when absent. */
  displaySetInstanceUID?: string;
}

/**
 * Per-viewport interaction/appearance operations, extracted out of commandsModule so
 * command bodies stay thin. The implementation (NextViewportOperations) uses the
 * cornerstone API of the viewport directly (getViewState, setDisplaySetPresentation,
 * getViewReference), or the viewport adapter where it has the call.
 *
 * RENDER: no method calls viewport.render(). The caller renders, matching today's
 * per-command render timing (e.g. setViewportColormap renders only when immediate).
 *
 * VIEWPORT RESOLUTION: never done here — the command owns "which viewport".
 */
export interface IViewportOperations {
  // ---- camera / view-state ----

  /** Toggle (default) or set horizontal flip. */
  flipHorizontal(viewport: CoreTypes.IViewport, newValue?: FlipValue): void;

  /** Toggle (default) or set vertical flip. */
  flipVertical(viewport: CoreTypes.IViewport, newValue?: FlipValue): void;

  /** Rotate: mode 'apply' = relative, mode 'set' = absolute (with flip-parity correction). */
  rotate(viewport: CoreTypes.IViewport, rotation: number, mode?: RotationMode): void;

  /** Reset the presentation and the view state to defaults (the slice is preserved). */
  reset(viewport: CoreTypes.IViewport): void;

  /** Zoom by direction: >0 in, <0 out, 0 = fit-to-window (reset). */
  scaleBy(viewport: CoreTypes.IViewport, direction: number): void;

  /** Read the view-plane normal. */
  getViewPlaneNormal(viewport: CoreTypes.IViewport): CoreTypes.Point3 | undefined;

  /**
   * In-plane re-center (+ zoom-to-fit) of a measurement AFTER the caller's setViewReference
   * slice jump. Returns true when it re-centered (caller should render), false when the
   * measurement was already visible or in-plane centering is unsupported.
   */
  centerOnMeasurement(viewport: CoreTypes.IViewport, measurement: Record<string, unknown>): boolean;

  // ---- appearance / properties ----

  /** Toggle invert. */
  invert(viewport: CoreTypes.IViewport): void;

  /** Apply a VOI window/level. */
  setWindowLevel(viewport: CoreTypes.IViewport, params: WindowLevelParams): void;

  /** Apply a colormap. */
  setColormap(viewport: CoreTypes.IViewport, params: ColormapParams): void;

  // ---- 3D volume rendering ----

  /** VR preset. */
  setPreset(viewport: CoreTypes.IViewport, preset: string): void;

  /** VR sample distance / samples-per-ray quality. */
  setVolumeRenderingQuality(viewport: CoreTypes.IViewport, volumeQuality: number): void;

  /** Shift scalar-opacity transfer-function points. */
  shiftVolumeOpacityPoints(viewport: CoreTypes.IViewport, shift: number): void;

  /** VR lighting (shade/ambient/diffuse/specular). */
  setVolumeLighting(viewport: CoreTypes.IViewport, options: VolumeLightingOptions): void;
}
