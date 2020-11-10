function getIntersection({ start, end, start2, end2 }) {
  const { x: xa1, y: ya1 } = start;
  const { x: xa2, y: ya2 } = end;
  const { x: xb1, y: yb1 } = start2;
  const { x: xb2, y: yb2 } = end2;

  // prettier-ignore
  const a = (xb1 - xb2) / (yb2 - yb1);
  const b = (yb1 + yb2) / 2 - (xb1 ** 2 - xb2 ** 2) / (2 * (yb2 - yb1));
  const c = (xa1 - xa2) / (ya2 - ya1);
  const d = (ya1 + ya2) / 2 - (xa1 ** 2 - xa2 ** 2) / (2 * (ya2 - ya1));

  const intersection = {
    x: (b - d) / (c - a),
    y: (a * b - a * d - a * b + b * c) / (c - a),
  };

  return intersection;
}

export { getIntersection };
