jest.mock('@cornerstonejs/ai', () => ({ ONNXSegmentationController: class {} }));
jest.mock('@cornerstonejs/labelmap-interpolation', () => ({}));
jest.mock('./initCornerstoneTools', () => ({ toolNames: {} }));
jest.mock('@ohif/extension-default', () => ({
  callInputDialogAutoComplete: jest.fn(),
  createReportAsync: jest.fn(),
  colorPickerDialog: jest.fn(),
  callInputDialog: jest.fn(),
}));

import commandsModule from './commandsModule';

type Pane = {
  viewportId: string;
  displaySetInstanceUIDs: string[];
  viewportOptions: Record<string, unknown>;
  displaySetOptions?: unknown[];
};

const CT = 'ct-display-set';
const FRAME_OF_REFERENCE = 'frame-of-reference';

const displaySets = {
  [CT]: {
    displaySetInstanceUID: CT,
    Modality: 'CT',
    isReconstructable: true,
    FrameOfReferenceUID: FRAME_OF_REFERENCE,
  },
  rtstruct: {
    displaySetInstanceUID: 'rtstruct',
    Modality: 'RTSTRUCT',
    isOverlayDisplaySet: true,
    referencedDisplaySetInstanceUID: CT,
    isReconstructable: true,
    FrameOfReferenceUID: FRAME_OF_REFERENCE,
  },
  seg: {
    displaySetInstanceUID: 'seg',
    Modality: 'SEG',
    isOverlayDisplaySet: true,
    referencedDisplaySetInstanceUID: CT,
    isReconstructable: true,
    FrameOfReferenceUID: FRAME_OF_REFERENCE,
  },
};

const mprPanes = (): Pane[] =>
  ['axial', 'sagittal', 'coronal'].map(orientation => ({
    viewportId: `mpr-${orientation}`,
    displaySetInstanceUIDs: [CT],
    viewportOptions: { viewportId: `mpr-${orientation}`, viewportType: 'volume', orientation },
  }));

const stackPane = (): Pane[] => [
  {
    viewportId: 'default',
    displaySetInstanceUIDs: [CT],
    viewportOptions: { viewportId: 'default', viewportType: 'stack' },
  },
];

/**
 * Builds the commands module over a grid of the given panes. The grid applies an update
 * as the reducer of the viewport grid does in a hanging protocol layout: the options of
 * the update are merged over the options of the pane.
 */
function makeViewer(panes: Pane[], activeViewportId: string) {
  const grid = {
    isHangingProtocolLayout: true,
    activeViewportId,
    viewports: new Map(panes.map(pane => [pane.viewportId, pane])),
  };

  const viewportGridService = {
    getState: () => grid,
    getActiveViewportId: () => grid.activeViewportId,
    getDisplaySetsUIDsForViewport: (viewportId: string) =>
      grid.viewports.get(viewportId)?.displaySetInstanceUIDs,
    setDisplaySetsForViewports: (updates: Pane[]) => {
      updates.forEach(update => {
        const previous = grid.viewports.get(update.viewportId);
        grid.viewports.set(update.viewportId, {
          ...previous,
          displaySetInstanceUIDs: update.displaySetInstanceUIDs,
          viewportOptions: { ...previous?.viewportOptions, ...update.viewportOptions },
        });
      });
    },
  };

  const services = {
    viewportGridService,
    cineService: { getState: () => ({ cines: {} }), setCine: () => undefined },
    cornerstoneViewportService: { getCornerstoneViewport: () => undefined },
    displaySetService: { getDisplaySetByUID: (uid: string) => displaySets[uid] },
    customizationService: { getCustomization: () => undefined },
    segmentationService: { getSegmentation: () => undefined },
    hangingProtocolService: {
      getViewportsRequireUpdate: (viewportId: string, displaySetInstanceUID: string) => [
        { viewportId, displaySetInstanceUIDs: [displaySetInstanceUID] },
      ],
    },
  };

  const commands: Record<string, (args: unknown) => unknown> = {};
  const commandsManager = {
    runCommand: (name: string, args: unknown) => commands[name]?.(args),
    run: (name: string, args: unknown) => commands[name]?.(args),
  };

  const { actions } = commandsModule({
    servicesManager: { services },
    commandsManager,
    extensionManager: {},
  } as never) as unknown as { actions: Record<string, (args: unknown) => unknown> };

  commands.loadSegmentationDisplaySetsForViewport = actions.loadSegmentationDisplaySetsForViewport;

  return { actions, grid };
}

describe('hydrateSecondaryDisplaySet keeps the type and the orientation of each pane', () => {
  it.each(['axial', 'sagittal', 'coronal'])(
    'an RTSTRUCT hydrated in the %s pane of an MPR leaves every pane a volume in its orientation',
    async orientation => {
      const { actions, grid } = makeViewer(mprPanes(), `mpr-${orientation}`);

      await actions.hydrateSecondaryDisplaySet({
        displaySet: displaySets.rtstruct,
        viewportId: `mpr-${orientation}`,
      });

      expect(
        [...grid.viewports.values()].map(pane => [
          pane.viewportId,
          pane.viewportOptions.viewportType,
          pane.viewportOptions.orientation,
          pane.displaySetInstanceUIDs,
        ])
      ).toEqual([
        ['mpr-axial', 'volume', 'axial', [CT]],
        ['mpr-sagittal', 'volume', 'sagittal', [CT]],
        ['mpr-coronal', 'volume', 'coronal', [CT]],
      ]);
    }
  );

  it('an RTSTRUCT hydrated in a stack pane leaves it a stack', async () => {
    const { actions, grid } = makeViewer(stackPane(), 'default');

    await actions.hydrateSecondaryDisplaySet({
      displaySet: displaySets.rtstruct,
      viewportId: 'default',
    });

    expect(grid.viewports.get('default')).toMatchObject({
      displaySetInstanceUIDs: [CT],
      viewportOptions: { viewportType: 'stack' },
    });
  });

  it('a SEG hydrated in the sagittal pane of an MPR leaves it a sagittal volume', async () => {
    const { actions, grid } = makeViewer(mprPanes(), 'mpr-sagittal');

    await actions.hydrateSecondaryDisplaySet({
      displaySet: displaySets.seg,
      viewportId: 'mpr-sagittal',
    });

    expect(grid.viewports.get('mpr-sagittal')?.viewportOptions).toMatchObject({
      viewportType: 'volume',
      orientation: 'sagittal',
    });
  });
});
