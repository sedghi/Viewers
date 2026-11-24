/**
 * Normalizes a colormap opacity value to a single 0..1 scalar for the opacity
 * slider. `colormap.opacity` may be a plain number or an array of
 * `{ value, opacity }` points (e.g. the HP fusion opacity ramp). The slider
 * scales such points (`setLayerOpacity`), and points drawn as they are given
 * are the slider at 1, as on the legacy volume viewport, which read a ramp
 * back with an overall opacity of 1.
 */
export const resolveOpacityScalar = (opacityVal: unknown): number | undefined => {
  if (opacityVal === undefined || opacityVal === null) {
    return undefined;
  }

  if (Array.isArray(opacityVal)) {
    return opacityVal.length ? 1 : undefined;
  }

  return opacityVal as number;
};
