import { resolveOpacityScalar } from './resolveOpacityScalar';

describe('resolveOpacityScalar', () => {
  it('gives a number as it is', () => {
    expect(resolveOpacityScalar(0.4)).toBe(0.4);
    expect(resolveOpacityScalar(0)).toBe(0);
  });

  it('gives 1 for opacity points, which are drawn as they are given', () => {
    expect(
      resolveOpacityScalar([
        { value: 0, opacity: 0 },
        { value: 0.1, opacity: 0.8 },
        { value: 1, opacity: 0.9 },
      ])
    ).toBe(1);
  });

  it('gives undefined when there is no opacity', () => {
    expect(resolveOpacityScalar(undefined)).toBeUndefined();
    expect(resolveOpacityScalar(null)).toBeUndefined();
    expect(resolveOpacityScalar([])).toBeUndefined();
  });
});
