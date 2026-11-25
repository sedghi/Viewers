import { expect, test, visitStudy, waitForViewportsRendered } from './utils';

test.beforeEach(async ({ page }) => {
  const studyInstanceUID = '1.3.6.1.4.1.5962.99.1.2968617883.1314880426.1493322302363.3.0';
  const mode = 'viewer';
  await visitStudy(page, studyInstanceUID, mode, 2000);
});

/**
 * The type and the orientation that the grid gives each pane, and what its viewport
 * shows: the mode and the orientation of its display sets and its number of slices.
 */
const readPanes = page =>
  page.evaluate(() => {
    const { viewportGridService, cornerstoneViewportService } = (window as any).services;

    return [...viewportGridService.getState().viewports.values()].map(pane => {
      const viewport = cornerstoneViewportService.getCornerstoneViewport(pane.viewportId);

      return {
        viewportId: pane.viewportId,
        viewportType: pane.viewportOptions.viewportType,
        orientation: pane.viewportOptions.orientation,
        displaySets: viewport
          .getDisplaySets()
          .map(({ options }) => ({ mode: options.mode, orientation: options.orientation })),
        numberOfSlices: viewport.getNumberOfSlices(),
      };
    });
  });

const MPR_PANES = [
  { orientation: 'axial', numberOfSlices: 262 },
  { orientation: 'sagittal', numberOfSlices: 512 },
  { orientation: 'coronal', numberOfSlices: 512 },
].map(({ orientation, numberOfSlices }) => ({
  viewportId: `mpr-${orientation}`,
  viewportType: 'volume',
  orientation,
  displaySets: [{ mode: 'volume', orientation }],
  numberOfSlices,
}));

for (const orientation of ['sagittal', 'coronal']) {
  test(`should keep every pane of an MPR a volume in its orientation when an RTSTRUCT is hydrated from the ${orientation} pane`, async ({
    page,
    DOMOverlayPageObject,
    leftPanelPageObject,
    mainToolbarPageObject,
  }) => {
    await mainToolbarPageObject.layoutSelection.MPR.click();
    await waitForViewportsRendered(page, { timeout: 60000 });

    await page.evaluate(
      viewportId => (window as any).services.viewportGridService.setActiveViewportId(viewportId),
      `mpr-${orientation}`
    );

    expect(await readPanes(page)).toEqual(MPR_PANES);

    await leftPanelPageObject.loadSeriesByModality('RTSTRUCT');

    const hydrationPrompt = DOMOverlayPageObject.viewport.segmentationHydration;
    await expect(hydrationPrompt.locator).toBeVisible({ timeout: 10000 });
    await hydrationPrompt.yes.click();

    await page.waitForFunction(() => {
      const { viewportGridService, segmentationService } = (window as any).services;

      return [...viewportGridService.getState().viewports.keys()].every(
        viewportId => segmentationService.getSegmentationRepresentations(viewportId).length > 0
      );
    });
    await waitForViewportsRendered(page, { timeout: 60000 });

    expect(await readPanes(page)).toEqual(MPR_PANES);
  });
}
