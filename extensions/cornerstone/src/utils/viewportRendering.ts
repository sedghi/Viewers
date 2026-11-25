/**
 * Aliases accepted by the `viewportRendering` param/config, mapped to
 * cornerstone render backend wire ids ('gpu' is the VTK/WebGL backend).
 * Values not listed here pass through untouched so backends registered via
 * cornerstone's `registerRenderBackend()` (e.g. a webgpu backend) can be
 * selected by their wire id.
 */
const RENDER_BACKEND_ALIASES: Record<string, string> = {
  webgl: 'gpu',
  gpu: 'gpu',
  cpu: 'cpu',
  auto: 'auto',
};

function normalizeRenderBackend(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return RENDER_BACKEND_ALIASES[trimmed.toLowerCase()] ?? trimmed;
}

export interface ViewportRenderingSelection {
  /** Global render backend for all viewports (cornerstone `setRenderBackend`). */
  renderBackend?: string;
  /**
   * Per-viewport-type overrides (per-mount `renderBackend` option), keyed by
   * the lowercased OHIF viewport type (e.g. 'stack', 'orthographic').
   */
  renderBackendByViewportType: Record<string, string>;
}

/**
 * Resolves the render backend selection at init.
 *
 * `?viewportRendering=cpu|webgl|webgpu|auto` selects the render backend for
 * all viewports per-session, and `?<viewportType>.viewportRendering=<backend>`
 * (e.g. `?orthographic.viewportRendering=cpu`) overrides it for a single
 * viewport type via the per-mount `renderBackend` option. URL params take
 * precedence over `appConfig.viewportRendering`, which accepts
 * either a backend string or `{ default?, stack?, orthographic? }`.
 *
 * 'webgl' is an alias for cornerstone's 'gpu' (VTK/WebGL) backend; 'cpu' and
 * 'auto' map to the same-named backends; any other value is passed through as
 * the wire id of a backend registered with `registerRenderBackend()` (e.g. a
 * webgpu backend). Unlike a boolean CPU flag, this lets a session force GPU
 * rendering when the deployed config defaults to CPU, and vice versa.
 */
export function resolveViewportRendering(appConfigValue: unknown): ViewportRenderingSelection {
  const selection: ViewportRenderingSelection = { renderBackendByViewportType: {} };

  if (typeof appConfigValue === 'string') {
    selection.renderBackend = normalizeRenderBackend(appConfigValue);
  } else if (appConfigValue && typeof appConfigValue === 'object') {
    for (const [key, value] of Object.entries(appConfigValue)) {
      const backend = normalizeRenderBackend(value);
      if (!backend) {
        continue;
      }
      if (key === 'default') {
        selection.renderBackend = backend;
      } else {
        selection.renderBackendByViewportType[key.toLowerCase()] = backend;
      }
    }
  }

  try {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of params.entries()) {
      const backend = normalizeRenderBackend(value);
      if (!backend) {
        continue;
      }
      if (key === 'viewportRendering') {
        selection.renderBackend = backend;
      } else if (key.endsWith('.viewportRendering')) {
        const viewportType = key.slice(0, -'.viewportRendering'.length).toLowerCase();
        if (viewportType) {
          selection.renderBackendByViewportType[viewportType] = backend;
        }
      }
    }
  } catch {
    // window/URL unavailable (SSR/non-browser) — keep the config-derived selection.
  }

  return selection;
}

/**
 * Per-viewport-type render backend overrides, captured once at extension init
 * and read by the mount paths in ViewportBackend, which pass the override
 * as the per-mount `renderBackend` option on `setDisplaySets`.
 */
let renderBackendByViewportType: Record<string, string> = {};

export function setViewportRenderingOverrides(overrides: Record<string, string>): void {
  renderBackendByViewportType = overrides ?? {};
}

export function getViewportRenderingOverride(viewportType: string): string | undefined {
  return renderBackendByViewportType[viewportType?.toLowerCase()];
}
