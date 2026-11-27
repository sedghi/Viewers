import { expect, test, visitStudy } from './utils';

const studyInstanceUID = '1.3.6.1.4.1.5962.99.1.2968617883.1314880426.1493322302363.3.0';

/** Slices away from the middle of each MPR pane of the CT (262 axial, 512 sagittal and coronal). */
const SCROLLED = { 'mpr-axial': 78, 'mpr-sagittal': 153, 'mpr-coronal': 400 };

/**
 * An RTSTRUCT loaded into an MPR pane mounts the pane again with the CT that
 * it references, and the hydration mounts it again with the CT: the pane
 * keeps the slice it was on through both (M92), with no NEW_IMAGE of
 * another slice, and the other panes keep theirs.
 */
for (const paneId of Object.keys(SCROLLED)) {
  test(`an RTSTRUCT loaded into the ${paneId} pane and hydrated keeps the slice of the pane`, async ({
    page,
    DOMOverlayPageObject,
    leftPanelPageObject,
    mainToolbarPageObject,
    rightPanelPageObject,
  }) => {
    await visitStudy(page, studyInstanceUID, 'viewer', 2000);
    await rightPanelPageObject.toggle();
    await mainToolbarPageObject.layoutSelection.MPR.click();

    const slicesAre = (slices: Record<string, number>) =>
      page.waitForFunction(
        expected => {
          const engine = (
            window as any
          ).services?.cornerstoneViewportService?.getRenderingEngine?.();
          return Object.entries(expected).every(([viewportId, sliceIndex]) => {
            const viewport = engine?.getViewport(viewportId);
            return (
              viewport?.viewportStatus === 'rendered' && viewport.getSliceIndex() === sliceIndex
            );
          });
        },
        slices,
        { timeout: 60_000 }
      );

    await slicesAre({ 'mpr-axial': 131, 'mpr-sagittal': 256, 'mpr-coronal': 256 });

    for (const [viewportId, imageIndex] of Object.entries(SCROLLED)) {
      await page.evaluate(
        ({ viewportId, imageIndex }) =>
          (window as any).commandsManager.runCommand('jumpToImage', {
            imageIndex,
            viewport: { id: viewportId },
          }),
        { viewportId, imageIndex }
      );
    }
    await slicesAre(SCROLLED);

    await page.evaluate(id => {
      const w = window as any;
      w.services.viewportGridService.setActiveViewportId(id);
      w.__newImageSlices = [];
      document.addEventListener(
        w.cornerstone.Enums.Events.NEW_IMAGE,
        (event: CustomEvent) => {
          if (event.detail?.viewportId === id) {
            w.__newImageSlices.push(event.detail.sliceIndex);
          }
        },
        true
      );
    }, paneId);

    await leftPanelPageObject.loadSeriesByModality('RTSTRUCT');
    await DOMOverlayPageObject.viewport.segmentationHydration.yes.button.waitFor();
    await slicesAre(SCROLLED);

    await DOMOverlayPageObject.viewport.segmentationHydration.yes.click();
    await page.waitForTimeout(3000);
    await slicesAre(SCROLLED);

    const newImageSlices: number[] = await page.evaluate(() => (window as any).__newImageSlices);
    expect(newImageSlices.length).toBeGreaterThan(0);
    expect(newImageSlices.filter(slice => slice !== SCROLLED[paneId])).toEqual([]);
  });
}
