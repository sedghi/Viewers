import { Types as CoreTypes } from '@cornerstonejs/core';
import type { IViewportAdapter } from './IViewportAdapter';
import { ViewportAdapter } from './ViewportAdapter';

const adapterCache = new WeakMap<object, IViewportAdapter>();

/**
 * Resolves the IViewportAdapter for a cornerstone viewport. Code outside the
 * viewport service consumes the adapter instead of the raw viewport surface.
 *
 * Adapters are stateless wrappers over the viewport, cached per viewport
 * instance, so calling this in render paths is cheap.
 */
export function getViewportAdapter(viewport: unknown): IViewportAdapter {
  if (!viewport || typeof viewport !== 'object') {
    throw new Error('getViewportAdapter: a viewport instance is required');
  }
  let adapter = adapterCache.get(viewport);
  if (!adapter) {
    adapter = new ViewportAdapter(viewport as ConstructorParameters<typeof ViewportAdapter>[0]);
    adapterCache.set(viewport, adapter);
  }
  return adapter;
}

/**
 * True for a viewport that renders volume content and therefore supports
 * volume-only appearance controls (threshold, per-layer opacity): a planar
 * viewport whose active binding is a volume.
 */
export function isVolumeRenderingViewport(viewport: unknown): boolean {
  return !!viewport && getViewportAdapter(viewport).isVolumeRendering();
}

/**
 * World-space focal point (current slice center) for any viewport. Exposed as
 * a free function because it is part of the extension's public API (consumed
 * by tmtv).
 */
export function getViewportFocalPoint(viewport: unknown): CoreTypes.Point3 | undefined {
  return viewport ? getViewportAdapter(viewport).getFocalPoint() : undefined;
}
