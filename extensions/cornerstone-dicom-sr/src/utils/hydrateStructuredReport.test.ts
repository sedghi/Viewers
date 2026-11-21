import { DicomMetadataStore } from '@ohif/core';
import { adaptersSR } from '@cornerstonejs/adapters';
import hydrateStructuredReport from './hydrateStructuredReport';

jest.mock('@cornerstonejs/adapters', () => ({
  adaptersSR: {
    Cornerstone3D: {
      MeasurementReport: { generateToolState: jest.fn() },
      CodeScheme: { codeValues: { CORNERSTONEFREETEXT: 'CORNERSTONEFREETEXT' } },
    },
  },
}));

jest.mock('@cornerstonejs/tools', () => ({
  annotation: { locking: { setAnnotationLocked: jest.fn() } },
}));

const FRAME_OF_REFERENCE_UID = 'frame-1';
const SR_DISPLAY_SET_UID = 'sr-display-set';
const IMAGE_DISPLAY_SET_UID = 'image-display-set';

const generateToolState = adaptersSR.Cornerstone3D.MeasurementReport.generateToolState as jest.Mock;

/**
 * Hydrates an SR with one SCOORD3D probe, which names a frame of reference and no
 * image, and gives the metadata of the annotation that the measurement service got.
 */
function hydrateProbe(imageDisplaySet: Record<string, unknown>) {
  const srDisplaySet = {
    displaySetInstanceUID: SR_DISPLAY_SET_UID,
    StudyInstanceUID: 'study-1',
    SeriesInstanceUID: 'sr-series',
    instance: { SOPInstanceUID: 'sr-instance' },
    measurements: [
      {
        displaySetInstanceUID: IMAGE_DISPLAY_SET_UID,
        coords: [
          { ValueType: 'SCOORD3D', ReferencedFrameOfReferenceSequence: FRAME_OF_REFERENCE_UID },
        ],
      },
    ],
  };
  const displaySets = {
    [SR_DISPLAY_SET_UID]: srDisplaySet,
    [IMAGE_DISPLAY_SET_UID]: imageDisplaySet,
  };
  const addRawMeasurement = jest.fn().mockReturnValue('measurement-1');

  generateToolState.mockReturnValue({
    Probe: [
      {
        annotation: {
          annotationUID: 'annotation-1',
          data: { handles: { points: [[1, 2, 3]] } },
          metadata: { FrameOfReferenceUID: FRAME_OF_REFERENCE_UID },
        },
      },
    ],
  });

  hydrateStructuredReport(
    {
      servicesManager: {
        services: {
          measurementService: {
            getSourceMappings: () => [{ annotationType: 'Probe', toMeasurementSchema: jest.fn() }],
            getSource: () => ({}),
            addRawMeasurement,
          },
          displaySetService: {
            getDisplaySetByUID: (uid: string) => displaySets[uid],
            getDisplaySetsBy: (predicate: (displaySet: unknown) => boolean) =>
              [imageDisplaySet].filter(predicate),
          },
          customizationService: { getCustomization: () => undefined },
        },
      },
      extensionManager: { getActiveDataSource: () => [{}] },
      commandsManager: { runCommand: jest.fn() },
    } as never,
    SR_DISPLAY_SET_UID
  );

  return addRawMeasurement.mock.calls[0][2].annotation.metadata;
}

describe('the view reference of a hydrated SCOORD3D measurement', () => {
  beforeEach(() => {
    jest.spyOn(DicomMetadataStore, 'getInstance').mockReturnValue({} as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('names the volume of the display set by its volume id', () => {
    const metadata = hydrateProbe({
      displaySetInstanceUID: IMAGE_DISPLAY_SET_UID,
      StudyInstanceUID: 'study-1',
      SeriesInstanceUID: 'image-series',
      FrameOfReferenceUID: FRAME_OF_REFERENCE_UID,
      isReconstructable: true,
    });

    expect(metadata.volumeId).toBe(`cornerstoneStreamingImageVolume:${IMAGE_DISPLAY_SET_UID}`);
    expect(metadata.FrameOfReferenceUID).toBe(FRAME_OF_REFERENCE_UID);
    expect(metadata.cameraFocalPoint).toEqual(new Float32Array([1, 2, 3]));
    expect(metadata.planeRestriction.point).toEqual([1, 2, 3]);
  });

  it('takes the volume loader of a display set that names one', () => {
    const metadata = hydrateProbe({
      displaySetInstanceUID: IMAGE_DISPLAY_SET_UID,
      StudyInstanceUID: 'study-1',
      SeriesInstanceUID: 'image-series',
      FrameOfReferenceUID: FRAME_OF_REFERENCE_UID,
      volumeLoaderSchema: 'cornerstoneStreamingDynamicImageVolume',
    });

    expect(metadata.volumeId).toBe(
      `cornerstoneStreamingDynamicImageVolume:${IMAGE_DISPLAY_SET_UID}`
    );
  });
});
