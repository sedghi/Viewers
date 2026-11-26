/**
 * The named home for the BEHAVIORAL POLICIES of the viewports: appearance
 * defaults that are not the mount lifecycle (that's
 * `services/ViewportService/`). Keeping them in one greppable file is the
 * point: a policy that lives inline in a mode or hanging protocol is
 * invisible to the next reader.
 */

/**
 * Initial opacity for data overlays (e.g. colormapped foreground layers, a PET
 * added over a CT from the data overlay menu). A viewport draws an overlay with
 * a flat alpha blend at the opacity given, so the nominal 0.9 of the menu would
 * read 90%. The legacy volume viewport of OHIF 3.13 drew that 0.9 as
 * `1 - (1 - 0.9) ** 0.125`, 0.25 (measured: a cold pixel of such a PET is 64
 * of 255): an overlay starts at this value, and its opacity slider there.
 */
export const OVERLAY_OPACITY = 0.25;
