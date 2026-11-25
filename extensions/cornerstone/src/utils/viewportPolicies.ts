/**
 * The named home for the BEHAVIORAL POLICIES of the viewports: appearance
 * defaults that are not the mount lifecycle (that's
 * `services/ViewportService/`). Keeping them in one greppable file is the
 * point: a policy that lives inline in a mode or hanging protocol is
 * invisible to the next reader.
 */

/**
 * Initial opacity for data overlays (e.g. colormapped foreground layers). A
 * viewport composites an overlay as a 2D image slice with a flat alpha blend
 * and no volume ray-cast opacity attenuation, so a nominal 0.9 would read
 * ~80-90%: an overlay starts at this value.
 */
export const OVERLAY_OPACITY = 0.4;
