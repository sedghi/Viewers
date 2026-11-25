import { displaySetRegistry } from '@cornerstonejs/core';
import { segmentation, Enums as ToolsEnums } from '@cornerstonejs/tools';
import { mountCaptureViewport, showSourceView } from './CornerstoneViewportDownloadForm';

jest.mock('@cornerstonejs/tools', () => {
  const actual = jest.requireActual('@cornerstonejs/tools');

  return {
    ...actual,
    segmentation: {
      ...actual.segmentation,
      addLabelmapRepresentationToViewportMap: jest.fn(),
      addContourRepresentationToViewportMap: jest.fn(),
    },
  };
});

jest.mock('html2canvas', () => jest.fn());
jest.mock('@ohif/core', () => ({ useSystem: jest.fn(), utils: { downloadUrl: jest.fn() } }));
jest.mock('../state', () => ({ getEnabledElement: jest.fn() }));

const ctOptions = {
  mode: 'volume',
  orientation: 'axial',
  role: 'source',
  volumeId: 'cornerstoneStreamingImageVolume:ct',
};
const ptOptions = {
  mode: 'volume',
  orientation: 'axial',
  role: 'overlay',
  volumeId: 'cornerstoneStreamingImageVolume:pt',
};
const labelmapId = 'seg-1-Labelmap-volume';

const viewReference = { viewPlaneNormal: [0, 0, 1], sliceIndex: 40, displaySetId: 'ct' };
const framing = { zoom: 2, pan: [0.1, -0.05], rotation: 30, flipHorizontal: true };

/**
 * A fusion pane as Cornerstone gives it: the CT, the PT over it with a
 * colormap that a user changed, and the labelmap that the tools mounted.
 */
function makeFusionSource() {
  const overrides = {
    ct: { voiRange: { lower: -160, upper: 240 } },
    pt: { colormap: { name: 'hsv' }, opacity: 0.6 },
    [labelmapId]: {},
  };

  return {
    id: 'fusion',
    getDisplaySets: () => [
      { displaySetId: 'ct', options: ctOptions },
      { displaySetId: 'pt', options: ptOptions },
      { displaySetId: labelmapId, options: { mode: 'volume', role: 'overlay' } },
    ],
    getDisplaySetAppearance: jest.fn((displaySetId: string) => overrides[displaySetId]),
    getViewReference: jest.fn(() => viewReference),
    getViewFraming: jest.fn(() => framing),
  };
}

function makeCapture() {
  const calls: string[] = [];

  return {
    calls,
    viewport: {
      id: 'cornerstone-viewport-download-form',
      setDisplaySets: jest.fn(async () => {
        calls.push('setDisplaySets');
      }),
      setViewReference: jest.fn(() => calls.push('setViewReference')),
      setViewFraming: jest.fn(() => calls.push('setViewFraming')),
      setViewState: jest.fn(),
      render: jest.fn(),
    },
  };
}

describe('the capture of a viewport', () => {
  beforeAll(() => {
    displaySetRegistry.add(labelmapId, {
      imageIds: ['labelmap-0'],
      reference: { kind: 'segmentation', segmentationId: 'seg-1' },
    });
  });

  afterAll(() => {
    displaySetRegistry.remove(labelmapId);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('mounts every layer that is not a segmentation, with its mount options and the appearance a user set', async () => {
    const source = makeFusionSource();
    const capture = makeCapture();

    await mountCaptureViewport(source as never, capture.viewport as never, []);

    expect(capture.viewport.setDisplaySets).toHaveBeenCalledTimes(1);
    expect(capture.viewport.setDisplaySets).toHaveBeenCalledWith(
      {
        displaySetId: 'ct',
        options: { ...ctOptions, appearance: { voiRange: { lower: -160, upper: 240 } } },
      },
      {
        displaySetId: 'pt',
        options: { ...ptOptions, appearance: { colormap: { name: 'hsv' }, opacity: 0.6 } },
      }
    );
  });

  it('shows the slice of the source, then its framing, which is relative to the fit', async () => {
    const source = makeFusionSource();
    const capture = makeCapture();

    await mountCaptureViewport(source as never, capture.viewport as never, []);

    expect(capture.calls).toEqual(['setDisplaySets', 'setViewReference', 'setViewFraming']);
    expect(capture.viewport.setViewReference).toHaveBeenCalledWith(viewReference);
    expect(capture.viewport.setViewFraming).toHaveBeenCalledWith(framing);
    expect(capture.viewport.setViewState).not.toHaveBeenCalled();
  });

  it('adds each segmentation representation of the source once, the labelmap through it', async () => {
    const source = makeFusionSource();
    const capture = makeCapture();
    const representations = [
      {
        segmentationId: 'seg-1',
        colorLUTIndex: 1,
        type: ToolsEnums.SegmentationRepresentations.Labelmap,
      },
      {
        segmentationId: 'rt-1',
        colorLUTIndex: 2,
        type: ToolsEnums.SegmentationRepresentations.Contour,
      },
    ];

    await mountCaptureViewport(source as never, capture.viewport as never, representations as never);

    expect(segmentation.addLabelmapRepresentationToViewportMap).toHaveBeenCalledTimes(1);
    expect(segmentation.addLabelmapRepresentationToViewportMap).toHaveBeenCalledWith({
      'cornerstone-viewport-download-form': [
        {
          segmentationId: 'seg-1',
          type: ToolsEnums.SegmentationRepresentations.Labelmap,
          config: { colorLUTOrIndex: 1 },
        },
      ],
    });
    expect(segmentation.addContourRepresentationToViewportMap).toHaveBeenCalledTimes(1);
  });

  it('shows the view of the source again at another size without mounting again', () => {
    const source = makeFusionSource();
    const capture = makeCapture();

    showSourceView(source as never, capture.viewport as never);

    expect(capture.viewport.setDisplaySets).not.toHaveBeenCalled();
    expect(capture.calls).toEqual(['setViewReference', 'setViewFraming']);
    expect(capture.viewport.render).toHaveBeenCalled();
  });

  it('shows a viewport without a framing by its view reference alone', () => {
    const source = { ...makeFusionSource(), getViewFraming: () => undefined };
    const capture = makeCapture();

    showSourceView(source as never, capture.viewport as never);

    expect(capture.calls).toEqual(['setViewReference']);
  });
});
