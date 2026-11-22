/**
 * The named home for the BEHAVIORAL POLICIES of the viewport path: appearance
 * defaults and workflow rules that are not API bridging (that's
 * `services/ViewportService/adapter/`) and not mount lifecycle (that's
 * `services/ViewportService/backends/`). Keeping them in one greppable file is
 * the point: a policy that lives inline in a mode or hanging protocol is
 * invisible to the next reader.
 */

/**
 * Initial PT opacity for TMTV fusion viewports. A per-value opacity ramp is
 * applied literally through the flat 2D blend (which would keep the background
 * transparent), so the fusion starts with this single flat, more CT-weighted
 * blend.
 */
export const FUSION_PT_OPACITY = 0.4;

/**
 * Initial opacity for data overlays (e.g. colormapped foreground layers). A
 * viewport composites an overlay as a 2D image slice with a flat alpha blend
 * and no volume ray-cast opacity attenuation, so a nominal 0.9 would read
 * ~80-90%: an overlay starts at this value.
 */
export const OVERLAY_OPACITY = 0.4;

/**
 * Viewport type to pin when hydrating a segmentation's referenced display set.
 * RTSTRUCT contours render correctly on a stack viewport and scroll fast, so
 * the referenced image stays in stack mode on hydrate rather than being
 * promoted to a volume slice (which the perf acceptance criteria forbid).
 * Scoped to RTSTRUCT; SEG keeps the default (undefined = no pin).
 */
export function getHydrationViewportTypeForModality(modality: string): 'stack' | undefined {
  return modality === 'RTSTRUCT' ? 'stack' : undefined;
}
