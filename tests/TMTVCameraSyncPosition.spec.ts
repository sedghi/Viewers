import { expect, test, visitStudy } from './utils';

const studyInstanceUID = '1.2.840.113619.2.290.3.3767434740.226.1600859119.501';

const GROUPS = {
  axial: { ct: 'ctAXIAL', others: ['ptAXIAL', 'fusionAXIAL'], ctSlice: 'first' },
  sagittal: { ct: 'ctSAGITTAL', others: ['ptSAGITTAL', 'fusionSAGITTAL'], ctSlice: 'middle' },
  coronal: { ct: 'ctCORONAL', others: ['ptCORONAL', 'fusionCoronal'], ctSlice: 'middle' },
};

type PaneState = {
  sliceIndex: number;
  numberOfSlices: number;
  slicePoint: number[];
  normal: number[];
  step: number;
};

/**
 * The panes of each camera position sync group of the TMTV mode open on one
 * position, the initial slice of the CT, whatever the order in which they
 * mount: the slice of each pane lies within half a slice of the slice of the
 * CT pane.
 */
for (let load = 1; load <= 5; load++) {
  test(`the panes of a sync group open on the slice of the CT, load ${load}`, async ({ page }) => {
    await visitStudy(page, studyInstanceUID, 'tmtv', 2000);

    await page.waitForFunction(
      () => {
        const engine = (window as any).services?.cornerstoneViewportService?.getRenderingEngine?.();
        const viewports = (engine?.getViewports?.() ?? []).filter(
          viewport => !String(viewport.id).includes('download')
        );
        return viewports.length >= 10 && viewports.every(v => v.viewportStatus === 'rendered');
      },
      undefined,
      { timeout: 60_000 }
    );
    await page.waitForTimeout(3000);

    const panes: Record<string, PaneState> = await page.evaluate(
      ids => {
        const { cornerstone, services } = window as unknown as {
          cornerstone: {
            utilities: {
              getTargetVolumeAndSpacingInNormalDir: (
                viewport: unknown,
                camera: unknown
              ) => { spacingInNormalDirection: number };
            };
          };
          services: { cornerstoneViewportService: { getRenderingEngine: () => any } };
        };
        const engine = services.cornerstoneViewportService.getRenderingEngine();
        return Object.fromEntries(
          ids.map(id => {
            const viewport = engine.getViewport(id);
            const camera = viewport.getResolvedView().toICamera();
            return [
              id,
              {
                sliceIndex: viewport.getSliceIndex(),
                numberOfSlices: viewport.getNumberOfSlices(),
                slicePoint: viewport.getViewReference().cameraFocalPoint,
                normal: camera.viewPlaneNormal,
                step: cornerstone.utilities.getTargetVolumeAndSpacingInNormalDir(viewport, camera)
                  .spacingInNormalDirection,
              },
            ];
          })
        );
      },
      Object.values(GROUPS).flatMap(group => [group.ct, ...group.others])
    );

    for (const [name, group] of Object.entries(GROUPS)) {
      const ct = panes[group.ct];
      const expectedCtSlice = group.ctSlice === 'first' ? 0 : Math.floor(ct.numberOfSlices / 2);
      expect(ct.sliceIndex, `${name}: the CT pane is on its ${group.ctSlice} slice`).toBe(
        expectedCtSlice
      );

      for (const id of group.others) {
        const pane = panes[id];
        const distance = Math.abs(
          (pane.slicePoint[0] - ct.slicePoint[0]) * ct.normal[0] +
            (pane.slicePoint[1] - ct.slicePoint[1]) * ct.normal[1] +
            (pane.slicePoint[2] - ct.slicePoint[2]) * ct.normal[2]
        );
        expect(
          distance,
          `${name}: the slice of ${id} is within half of its slice of the slice of the CT`
        ).toBeLessThanOrEqual(pane.step / 2 + 1e-3);
      }
    }
  });
}
