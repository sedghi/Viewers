/**
 * Normalizes a colormap opacity value to a single 0..1 scalar for the opacity
 * slider. `colormap.opacity` may be a plain number or an array of
 * `{ value, opacity }` points (e.g. the HP fusion opacity ramp); for the array
 * case we represent it by its maximum opacity. (A prior reduce ran over the point
 * objects directly, producing NaN and a mispositioned slider.)
 */
export const resolveOpacityScalar = (opacityVal: unknown): number | undefined => {
  if (opacityVal === undefined || opacityVal === null) {
    return undefined;
  }

  if (Array.isArray(opacityVal)) {
    return opacityVal.reduce((max: number, point) => {
      const value = typeof point === 'number' ? point : (point?.opacity ?? 0);
      return Math.max(max, value);
    }, 0);
  }

  return opacityVal as number;
};
