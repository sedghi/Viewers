import { act, renderHook } from '@testing-library/react';
import { Enums } from '@cornerstonejs/core';
import { useViewportRendering } from './useViewportRendering';

const mockServices: Record<string, unknown> = {};

jest.mock('@ohif/core', () => ({
  useSystem: () => ({ servicesManager: { services: mockServices }, commandsManager: {} }),
}));

const ct = { displaySetInstanceUID: 'ct', Modality: 'CT' };
const pt = { displaySetInstanceUID: 'pt', Modality: 'PT' };

jest.mock('./useViewportDisplaySets', () => ({
  useViewportDisplaySets: () => ({
    viewportDisplaySets: [ct, pt],
    foregroundDisplaySets: [pt],
  }),
}));

/**
 * A fusion viewport that shows the CT as its source and the PT over it, drawn
 * with the effective appearances given.
 */
function makeFusionViewport(effective: Record<string, Record<string, unknown>>) {
  return {
    id: 'fusion',
    type: Enums.ViewportType.PLANAR,
    element: document.createElement('div'),
    getDisplaySets: () => [{ displaySetId: 'ct' }, { displaySetId: 'pt' }],
    getEffectiveDisplaySetAppearance: jest.fn((displaySetId: string) => effective[displaySetId]),
    getDisplaySetAppearance: jest.fn(() => ({})),
    setDisplaySetAppearance: jest.fn(),
    getCurrentMode: () => 'volume',
    render: jest.fn(),
  };
}

function setServices(viewport: unknown) {
  Object.assign(mockServices, {
    cornerstoneViewportService: {
      getCornerstoneViewport: () => viewport,
      getViewportInfo: () => ({ getViewportOptions: () => ({}) }),
      subscribe: () => ({ unsubscribe: () => undefined }),
      EVENTS: {},
    },
    colorbarService: {
      hasColorbar: () => false,
      subscribe: () => ({ unsubscribe: () => undefined }),
      EVENTS: {},
    },
    customizationService: { getCustomization: () => undefined },
    displaySetService: { getDisplaySetByUID: () => undefined },
  });
}

function fire(
  element: HTMLElement,
  detail: Partial<{
    displaySetId: string;
    role: string;
    cause: string;
    changedKeys: string[];
    effective: Record<string, unknown>;
  }>
) {
  act(() => {
    element.dispatchEvent(
      new CustomEvent(Enums.Events.DISPLAY_SET_APPEARANCE_CHANGED, {
        detail: { overrides: {}, effective: {}, changedKeys: [], cause: 'edit', ...detail },
      })
    );
  });
}

describe('useViewportRendering on a fusion', () => {
  const ctWindow = { lower: -160, upper: 240 };
  const ptWindow = { lower: 0, upper: 5 };
  let viewport: ReturnType<typeof makeFusionViewport>;

  beforeEach(() => {
    viewport = makeFusionViewport({
      ct: { voiRange: ctWindow, opacity: 1 },
      pt: { voiRange: ptWindow, opacity: 1, colormap: { name: 'hsv', opacityMapping: [] } },
    });
    setServices(viewport);
  });

  it('reads the window and the opacity that the PT is drawn with', () => {
    const { result } = renderHook(() => useViewportRendering('fusion'));

    expect(result.current.voiRange).toEqual(ptWindow);
    expect(result.current.opacity).toBe(1);
    expect(result.current.threshold).toBeUndefined();
  });

  it('follows the appearance event of the PT, for every cause, and not that of the CT', () => {
    const { result } = renderHook(() => useViewportRendering('fusion'));
    const { element } = viewport;

    fire(element, {
      displaySetId: 'ct',
      role: 'source',
      changedKeys: ['voiRange', 'opacity'],
      effective: { voiRange: { lower: 1, upper: 2 }, opacity: 0.1 },
    });
    expect(result.current.voiRange).toEqual(ptWindow);
    expect(result.current.opacity).toBe(1);

    fire(element, {
      displaySetId: 'pt',
      role: 'overlay',
      changedKeys: ['opacity'],
      effective: { voiRange: ptWindow, opacity: 0.4 },
    });
    expect(result.current.opacity).toBe(0.4);

    fire(element, {
      displaySetId: 'pt',
      role: 'overlay',
      cause: 'default',
      changedKeys: ['voiRange'],
      effective: { voiRange: { lower: 0, upper: 7 }, opacity: 0.4 },
    });
    expect(result.current.voiRange).toEqual({ lower: 0, upper: 7 });

    fire(element, {
      displaySetId: 'pt',
      role: 'overlay',
      cause: 'reset',
      changedKeys: ['colormap'],
      effective: { colormap: { name: 'hsv', threshold: 2.5 }, opacity: 0.4 },
    });
    expect(result.current.threshold).toBe(2.5);
  });

  it('sets the opacity of the PT alone, and the threshold alone in its colormap', () => {
    const { result } = renderHook(() => useViewportRendering('fusion'));

    act(() => result.current.setOpacity(0.3));
    act(() => result.current.setThreshold(2.5));

    expect(viewport.setDisplaySetAppearance).toHaveBeenNthCalledWith(1, 'pt', { opacity: 0.3 });
    expect(viewport.setDisplaySetAppearance).toHaveBeenNthCalledWith(2, 'pt', {
      colormap: { threshold: 2.5 },
    });
    expect(result.current.opacity).toBe(0.3);
    expect(result.current.threshold).toBe(2.5);
  });
});

describe('useViewportRendering on a viewport that shows the images an SR references', () => {
  it('reads and follows the source of the viewport', () => {
    const viewport = {
      ...makeFusionViewport({ image: { voiRange: { lower: 0, upper: 2000 }, opacity: 1 } }),
      getDisplaySets: () => [{ displaySetId: 'image' }],
    };
    setServices(viewport);

    const { result } = renderHook(() =>
      useViewportRendering('fusion', { displaySetInstanceUID: 'sr' })
    );

    expect(viewport.getEffectiveDisplaySetAppearance).toHaveBeenCalledWith(undefined);

    fire(viewport.element, {
      displaySetId: 'image',
      role: 'source',
      changedKeys: ['voiRange'],
      effective: { voiRange: { lower: 10, upper: 20 } },
    });

    expect(result.current.voiRange).toEqual({ lower: 10, upper: 20 });
  });
});
