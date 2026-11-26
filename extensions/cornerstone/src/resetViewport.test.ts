jest.mock('@cornerstonejs/ai', () => ({ ONNXSegmentationController: class {} }));
jest.mock('@cornerstonejs/labelmap-interpolation', () => ({}));
jest.mock('./initCornerstoneTools', () => ({ toolNames: {} }));
jest.mock('@ohif/extension-default', () => ({
  callInputDialogAutoComplete: jest.fn(),
  createReportAsync: jest.fn(),
  colorPickerDialog: jest.fn(),
  callInputDialog: jest.fn(),
}));
jest.mock('@cornerstonejs/core', () => {
  const actual = jest.requireActual('@cornerstonejs/core');

  return {
    ...actual,
    getEnabledElement: jest.fn(element => element?.enabledElement),
    utilities: { ...actual.utilities, jumpToSlice: jest.fn().mockResolvedValue(undefined) },
  };
});

import { Enums, utilities } from '@cornerstonejs/core';
import commandsModule from './commandsModule';
import { setEnabledElement } from './state';

type Pane = {
  id: string;
  mode: 'stack' | 'volume';
  numberOfSlices: number;
};

/** A planar viewport that has scrolled and zoomed, with the calls of a reset. */
function makeViewport({ id, mode, numberOfSlices }: Pane) {
  const element = {} as HTMLDivElement & { enabledElement?: unknown };
  const viewport = {
    id,
    type: Enums.ViewportType.PLANAR,
    element,
    getCurrentMode: () => mode,
    getNumberOfSlices: () => numberOfSlices,
    resetDisplaySetAppearance: jest.fn(),
    resetViewState: jest.fn(),
    render: jest.fn(),
  };
  element.enabledElement = { viewport, viewportId: id };
  setEnabledElement(id, element);

  return viewport;
}

/**
 * The commands module over viewports of one tool group, the first one active,
 * with the Crosshairs of the tool group in the given mode.
 */
function makeViewer(panes: Pane[], crosshairsMode?: string) {
  const viewports = panes.map(makeViewport);
  const toolGroup = {
    id: 'mpr',
    hasTool: (name: string) => name === 'Crosshairs' && crosshairsMode !== undefined,
    getToolOptions: () => ({ mode: crosshairsMode }),
    getViewportIds: () => panes.map(pane => pane.id),
  };
  const commandsManager = { run: jest.fn(), runCommand: jest.fn() };
  const services = {
    viewportGridService: {
      getState: () => ({ activeViewportId: panes[0].id }),
      getActiveViewportId: () => panes[0].id,
    },
    toolGroupService: { getToolGroupForViewport: () => toolGroup },
    cornerstoneViewportService: { getCornerstoneViewport: () => undefined },
  };

  const { actions } = commandsModule({
    servicesManager: { services },
    commandsManager,
    extensionManager: {},
  } as never) as unknown as { actions: Record<string, (args?: unknown) => unknown> };

  return { actions, viewports, commandsManager };
}

describe('resetViewport', () => {
  afterEach(() => (utilities.jumpToSlice as jest.Mock).mockClear());

  it.each([
    [512, 256],
    [135, 67],
    [20, 10],
  ])('takes a volume pane of %i slices back to its middle slice, %i', async (count, middle) => {
    const { actions, viewports } = makeViewer([
      { id: 'mpr-axial', mode: 'volume', numberOfSlices: count },
    ]);

    await actions.resetViewport();

    expect(viewports[0].resetViewState).toHaveBeenCalledTimes(1);
    expect(utilities.jumpToSlice).toHaveBeenCalledTimes(1);
    expect(utilities.jumpToSlice).toHaveBeenCalledWith(viewports[0].element, {
      imageIndex: middle,
    });
  });

  it('keeps the image of a stack', async () => {
    const { actions, viewports } = makeViewer([
      { id: 'default', mode: 'stack', numberOfSlices: 40 },
    ]);

    await actions.resetViewport();

    expect(viewports[0].resetViewState).toHaveBeenCalledTimes(1);
    expect(utilities.jumpToSlice).not.toHaveBeenCalled();
  });

  it('takes only the active pane to its middle slice without crosshairs', async () => {
    const { actions, viewports } = makeViewer([
      { id: 'mpr-axial', mode: 'volume', numberOfSlices: 135 },
      { id: 'mpr-sagittal', mode: 'volume', numberOfSlices: 512 },
    ]);

    await actions.resetViewport();

    expect(utilities.jumpToSlice).toHaveBeenCalledTimes(1);
    expect(utilities.jumpToSlice).toHaveBeenCalledWith(viewports[0].element, { imageIndex: 67 });
  });

  it('with the crosshairs, takes every pane of the tool group to its middle slice, then the crosshairs to where those slices meet', async () => {
    const { actions, viewports, commandsManager } = makeViewer(
      [
        { id: 'mpr-axial', mode: 'volume', numberOfSlices: 135 },
        { id: 'mpr-sagittal', mode: 'volume', numberOfSlices: 512 },
        { id: 'mpr-coronal', mode: 'volume', numberOfSlices: 512 },
      ],
      'Active'
    );

    await actions.resetViewport();

    expect((utilities.jumpToSlice as jest.Mock).mock.calls).toEqual([
      [viewports[0].element, { imageIndex: 67 }],
      [viewports[1].element, { imageIndex: 256 }],
      [viewports[2].element, { imageIndex: 256 }],
    ]);
    expect(commandsManager.run).toHaveBeenCalledWith('resetCrosshairs', {
      viewportId: 'mpr-axial',
    });
  });

  it('does not move the other panes when the crosshairs are disabled', async () => {
    const { actions } = makeViewer(
      [
        { id: 'mpr-axial', mode: 'volume', numberOfSlices: 135 },
        { id: 'mpr-sagittal', mode: 'volume', numberOfSlices: 512 },
      ],
      'Disabled'
    );

    await actions.resetViewport();

    expect(utilities.jumpToSlice).toHaveBeenCalledTimes(1);
  });
});
