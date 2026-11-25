import { utilities } from '@cornerstonejs/core';
import ViewportInfo, { getDisplaySetOptionsAppearance } from './Viewport';

const ramp = [
  { value: 0, opacity: 0 },
  { value: 0.1, opacity: 0.8 },
  { value: 1, opacity: 0.9 },
];

/** The display set options that a viewport keeps for the options of a protocol. */
function mapOptions(options: object) {
  const viewportInfo = new ViewportInfo('viewport-1');
  viewportInfo.setPublicDisplaySetOptions([{ options } as never]);

  return viewportInfo.getDisplaySetOptions()[0];
}

describe('the colormap of the display set options of a hanging protocol', () => {
  let error: jest.SpyInstance;

  beforeEach(() => {
    error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    error.mockRestore();
  });

  it('keeps the opacity mapping, the threshold and the opacity beside the colormap', () => {
    const options = mapOptions({
      colormap: { name: 'hsv', opacityMapping: ramp, threshold: 2.5 },
      opacity: 0.5,
    });

    expect(options.colormap).toEqual({ name: 'hsv', opacityMapping: ramp, threshold: 2.5 });
    expect(options.opacity).toBe(0.5);
    expect(error).not.toHaveBeenCalled();
  });

  it('says in development that colormap.opacity is gone and leaves the key out', () => {
    const options = mapOptions({ colormap: { name: 'hsv', opacity: ramp } });

    expect(options.colormap).toEqual({ name: 'hsv' });
    expect(options.opacity).toBeUndefined();
    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0][0]).toContain('colormap.opacity is gone');
    expect(error.mock.calls[0][0]).toContain('opacityMapping');
  });

  it('does not take a number in colormap.opacity for the opacity of the display set', () => {
    const options = mapOptions({ colormap: { name: 'hsv', opacity: 0.4 } });

    expect(options.colormap).toEqual({ name: 'hsv' });
    expect(options.opacity).toBeUndefined();
    expect(error).toHaveBeenCalledTimes(1);
  });
});

describe('the appearance of the display set options', () => {
  it('gives the window, the invert, the colormap and the opacity of the first draw', () => {
    expect(
      getDisplaySetOptionsAppearance({
        voi: { windowWidth: 400, windowCenter: 40 },
        voiInverted: true,
        colormap: { name: 'hsv', opacityMapping: ramp },
        opacity: 0.7,
      })
    ).toEqual({
      voiRange: utilities.windowLevel.toLowHighRange(400, 40),
      invert: true,
      colormap: { name: 'hsv', opacityMapping: ramp },
      opacity: 0.7,
    });
  });

  it('gives nothing for options without a look, so the data decides', () => {
    expect(getDisplaySetOptionsAppearance({ voiInverted: undefined })).toEqual({});
    expect(getDisplaySetOptionsAppearance(undefined)).toEqual({});
  });
});
