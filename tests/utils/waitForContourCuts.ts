import type { Page } from '@playwright/test';

/**
 * Waits until every pane that shows a contour segmentation has all its cuts
 * drawn: `segmentation.getContourCutsState` of Cornerstone3D is 'complete'
 * for each Contour representation of each pane (it turns complete with
 * `SEGMENTATION_CONTOUR_CUTS_COMPLETED`; a pane in the plane of the contours
 * needs no cut and is complete once the representation has rendered on it).
 * The panes of `viewportIds` must show a Contour representation, and at
 * least `minimumPanes` panes (one by default), so that the wait does not end
 * before the representation reaches the panes of a new layout. Then two
 * animation frames, so that a picture taken next has every cut on the canvas.
 */
export async function waitForContourCuts(
  page: Page,
  {
    viewportIds,
    minimumPanes = 1,
    timeout = 60_000,
  }: { viewportIds?: string[]; minimumPanes?: number; timeout?: number } = {}
) {
  await page.waitForFunction(
    ({ expectedViewportIds, minimumPanes }) => {
      const { cornerstoneTools, services } = window as any;
      const { segmentation, Enums } = cornerstoneTools;
      const engine = services.cornerstoneViewportService.getRenderingEngine();
      const contoursOf = (viewportId: string) =>
        segmentation.state.getSegmentationRepresentations(viewportId, {
          type: Enums.SegmentationRepresentations.Contour,
        });
      const panes = engine
        .getViewports()
        .map(viewport => ({ viewportId: viewport.id, representations: contoursOf(viewport.id) }))
        .filter(({ representations }) => representations.length);

      const shown =
        panes.length >= minimumPanes &&
        (expectedViewportIds ?? []).every(id => panes.some(({ viewportId }) => viewportId === id));

      return (
        shown &&
        panes.every(({ viewportId, representations }) =>
          representations.every(
            ({ segmentationId }) =>
              segmentation.getContourCutsState(viewportId, segmentationId) === 'complete'
          )
        )
      );
    },
    { expectedViewportIds: viewportIds, minimumPanes },
    { timeout }
  );
  await page.evaluate(
    () =>
      new Promise(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve(null)))
      )
  );
}
