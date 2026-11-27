import { expect, test, visitStudy } from './utils';

const studyInstanceUID = '1.3.6.1.4.1.5962.99.1.2968617883.1314880426.1493322302363.3.0';

type SliceEvent = { type: string; viewportId: string; sliceIndex: number };

/**
 * The CT of this study has 262 axial slices and 512 sagittal and coronal
 * slices. A mount judges the slice index of the view reference that it
 * starts at against the slices of the view that it shows, so a stored slice
 * beyond 261 starts there too (M91, fixed in Cornerstone3D `be7cbd1c8`).
 */
const CASES = [
  {
    title: 'within the slices of the acquisition plane',
    stored: { 'mpr-sagittal': 100, 'mpr-coronal': 200 },
  },
  {
    title: 'beyond the slices of the acquisition plane (M91)',
    stored: { 'mpr-sagittal': 300, 'mpr-coronal': 400 },
  },
];

/**
 * A sagittal and a coronal pane that come back with a stored position mount
 * at it: each NEW_IMAGE and each drawn frame of the pane, from its mount on,
 * is of the stored slice, never of its default slice first.
 */
for (const { title, stored: STORED } of CASES) {
  test(`the sagittal and the coronal pane of an MPR mount at their stored slice, ${title}`, async ({
    page,
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

    await slicesAre({ 'mpr-sagittal': 256, 'mpr-coronal': 256 });

    for (const [viewportId, imageIndex] of Object.entries(STORED)) {
      await page.evaluate(
        ({ viewportId, imageIndex }) =>
          (window as any).commandsManager.runCommand('jumpToImage', {
            imageIndex,
            viewport: { id: viewportId },
          }),
        { viewportId, imageIndex }
      );
    }
    await slicesAre(STORED);

    await mainToolbarPageObject.layoutSelection.grid(1, 1).click();
    await page.waitForFunction(
      () =>
        !(window as any).services.cornerstoneViewportService
          .getRenderingEngine()
          .getViewport('mpr-sagittal')
    );

    await page.evaluate(() => {
      const w = window as any;
      const { Events } = w.cornerstone.Enums;
      w.__sliceEvents = [] as SliceEvent[];
      const record = (type: string) => (event: CustomEvent) => {
        const { viewportId, renderingEngineId } = event.detail ?? {};
        if (!/mpr-(sagittal|coronal)/.test(viewportId)) {
          return;
        }
        const viewport = w.cornerstone
          .getRenderingEngine(renderingEngineId)
          ?.getViewport(viewportId);
        w.__sliceEvents.push({
          type,
          viewportId,
          sliceIndex: type === 'NEW_IMAGE' ? event.detail.sliceIndex : viewport?.getSliceIndex(),
        });
      };
      document.addEventListener(Events.NEW_IMAGE, record('NEW_IMAGE'), true);
      document.addEventListener(Events.IMAGE_RENDERED, record('IMAGE_RENDERED'), true);
    });

    await mainToolbarPageObject.layoutSelection.MPR.click();
    await slicesAre(STORED);

    const events: SliceEvent[] = await page.evaluate(() => (window as any).__sliceEvents);

    for (const [viewportId, sliceIndex] of Object.entries(STORED)) {
      const paneEvents = events.filter(event => event.viewportId === viewportId);

      expect(paneEvents.filter(event => event.type === 'NEW_IMAGE').length).toBeGreaterThan(0);
      expect(paneEvents.filter(event => event.type === 'IMAGE_RENDERED').length).toBeGreaterThan(0);
      expect(paneEvents.filter(event => event.sliceIndex !== sliceIndex)).toEqual([]);
    }
  });
}
