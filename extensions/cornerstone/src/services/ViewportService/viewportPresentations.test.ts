import { Enums } from '@cornerstonejs/core';
import type { Types } from '@cornerstonejs/core';
import {
  getLutPresentation,
  getPositionPresentation,
  setLutPresentation,
  setPositionPresentation,
} from './viewportPresentations';
import type ViewportInfo from './Viewport';
import type { PositionPresentation } from '../../types/Presentation';

describe('the stored LUT presentation', () => {
  const volumeInfo = { getViewportType: () => 'volume' } as unknown as ViewportInfo;

  it('holds what a user set on each display set that the viewport shows, by its UID', () => {
    const overrides = { ct: { voiRange: { lower: -160, upper: 240 } }, pt: { opacity: 0.4 } };
    const viewport = {
      type: Enums.ViewportType.PLANAR,
      getDisplaySets: () => [{ displaySetId: 'ct' }, { displaySetId: 'pt' }],
      getDisplaySetAppearance: jest.fn((displaySetId: string) => overrides[displaySetId]),
      getEffectiveDisplaySetAppearance: jest.fn(),
    };

    const lutPresentation = getLutPresentation(viewport as unknown as Types.IViewport, volumeInfo);

    expect(lutPresentation).toEqual({ viewportType: 'volume', appearances: overrides });
    expect(viewport.getEffectiveDisplaySetAppearance).not.toHaveBeenCalled();
  });

  it('gives each display set that the viewport shows its stored overrides', () => {
    const viewport = {
      getDisplaySets: jest.fn().mockReturnValue([{ displaySetId: 'ct' }, { displaySetId: 'pt' }]),
      setDisplaySetAppearance: jest.fn(),
    };

    setLutPresentation(viewport as unknown as Types.IViewport, {
      viewportType: 'volume',
      appearances: { ct: {}, pt: { opacity: 0.3 }, other: { invert: true } },
    });

    expect(viewport.setDisplaySetAppearance).toHaveBeenCalledTimes(1);
    expect(viewport.setDisplaySetAppearance).toHaveBeenCalledWith('pt', { opacity: 0.3 });
  });
});

describe('the position presentation', () => {
  const planarInfo = { getViewportType: () => 'stack' } as unknown as ViewportInfo;
  const info3D = { getViewportType: () => Enums.ViewportType.VOLUME_3D } as ViewportInfo;
  const viewReference = { referencedImageId: 'image-1', viewPlaneNormal: [0, 0, 1] };

  function makeFramedViewport(type: string, framing?: object, viewable = true) {
    return {
      id: `viewport-${type}`,
      type,
      getViewFraming: jest.fn().mockReturnValue(framing),
      setViewFraming: jest.fn(),
      getViewReference: jest.fn().mockReturnValue(viewReference),
      setViewReference: jest.fn(),
      isReferenceViewable: jest.fn().mockReturnValue(viewable),
      setViewState: jest.fn(),
    };
  }

  const store = (viewport, viewportInfo: ViewportInfo) =>
    getPositionPresentation(viewport as unknown as Types.IViewport, viewportInfo, viewport.id);

  const restore = (viewport, positionPresentation: PositionPresentation) =>
    setPositionPresentation(viewport as unknown as Types.IViewport, positionPresentation);

  it('stores the view reference and the framing of a planar viewport, how it fits too', () => {
    const framing = {
      zoom: 2,
      pan: [10, -4],
      rotation: 90,
      flipHorizontal: true,
      flipVertical: false,
      scaleMode: 'fitWidth',
      fitScale: [2, 2],
    };
    const viewport = makeFramedViewport(Enums.ViewportType.PLANAR, framing);

    const presentation = store(viewport, planarInfo);

    expect(viewport.getViewFraming).toHaveBeenCalledWith();
    expect(presentation).toEqual({
      viewportType: 'stack',
      viewReference,
      viewFraming: framing,
      viewportId: viewport.id,
    });
  });

  it('shows the stored slice first and then the stored framing', () => {
    const framing = { zoom: 2, pan: [10, -4], scaleMode: 'fitWidth', fitScale: [2, 2] };
    const viewport = makeFramedViewport(Enums.ViewportType.PLANAR);
    const order: string[] = [];
    viewport.setViewReference.mockImplementation(() => order.push('reference'));
    viewport.setViewFraming.mockImplementation(() => order.push('framing'));

    restore(viewport, {
      viewportType: 'stack',
      viewReference,
      viewFraming: framing,
    } as PositionPresentation);

    expect(viewport.isReferenceViewable).toHaveBeenCalledWith(viewReference, {
      withNavigation: true,
      withOrientation: true,
    });
    expect(viewport.setViewReference).toHaveBeenCalledWith(viewReference);
    expect(viewport.setViewFraming).toHaveBeenCalledWith(framing);
    expect(order).toEqual(['reference', 'framing']);
    expect(viewport.setViewState).not.toHaveBeenCalled();
  });

  it('keeps the framing of a reference that the viewport cannot show', () => {
    const framing = { zoom: 3 };
    const viewport = makeFramedViewport(Enums.ViewportType.PLANAR, undefined, false);

    restore(viewport, {
      viewportType: 'stack',
      viewReference,
      viewFraming: framing,
    } as PositionPresentation);

    expect(viewport.setViewReference).not.toHaveBeenCalled();
    expect(viewport.setViewFraming).toHaveBeenCalledWith(framing);
  });

  it('places a 3D viewport by the camera of its framing and stores no view reference', () => {
    const framing = {
      camera: { viewPlaneNormal: [1, 0, 0], viewUp: [0, 0, 1], focalPoint: [0, 0, 0] },
      zoom: 0.5,
      pan: [12, -4],
    };
    const viewport = makeFramedViewport(Enums.ViewportType.VOLUME_3D, framing);

    const presentation = store(viewport, info3D);
    restore(viewport, presentation);

    expect(presentation.viewReference).toBeNull();
    expect(presentation.viewFraming).toBe(framing);
    expect(viewport.getViewReference).not.toHaveBeenCalled();
    expect(viewport.setViewReference).not.toHaveBeenCalled();
    expect(viewport.setViewFraming).toHaveBeenCalledWith(framing);
  });

  it('leaves a viewport that showed nothing when it was stored', () => {
    const viewport = makeFramedViewport(Enums.ViewportType.VOLUME_3D, undefined);

    restore(viewport, store(viewport, info3D));

    expect(viewport.setViewFraming).not.toHaveBeenCalled();
    expect(viewport.setViewState).not.toHaveBeenCalled();
  });

  it('shows the slice of a position that a viewport of SEG or RTSTRUCT stored without a framing', () => {
    const viewport = makeFramedViewport(Enums.ViewportType.PLANAR);

    restore(viewport, { viewReference } as PositionPresentation);

    expect(viewport.setViewReference).toHaveBeenCalledWith(viewReference);
    expect(viewport.setViewFraming).not.toHaveBeenCalled();
  });
});
