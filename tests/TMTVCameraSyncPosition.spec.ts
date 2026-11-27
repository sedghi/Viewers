import { expect, test, visitStudy } from './utils';

const studyInstanceUID = '1.2.840.113619.2.290.3.3767434740.226.1600859119.501';

const GROUPS = {
  axial: { ct: 'ctAXIAL', others: ['ptAXIAL', 'fusionAXIAL'], ctSlice: 'first' },
  sagittal: { ct: 'ctSAGITTAL', others: ['ptSAGITTAL', 'fusionSAGITTAL'], ctSlice: 'middle' },
  coronal: { ct: 'ctCORONAL', others: ['ptCORONAL', 'fusionCoronal'], ctSlice: 'middle' },
};

const PANE_IDS = Object.values(GROUPS).flatMap(group => [group.ct, ...group.others]);

type PaneState = {
  sliceIndex: number;
  numberOfSlices: number;
  slicePoint: number[];
  normal: number[];
  step: number;
  parallelScale: number;
};

/** The slice, the slice point, the plane, the slice step and the scale of each pane. */
async function readPanes(page): Promise<Record<string, PaneState>> {
  return page.evaluate(ids => {
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
            parallelScale: camera.parallelScale,
          },
        ];
      })
    );
  }, PANE_IDS);
}

/**
 * The panes of each camera position sync group of the TMTV mode open on one
 * position, the initial slice of the CT, whatever the order in which they
 * mount: the slice of each pane lies within half a slice of the slice of the
 * CT pane. Each pane reports one slice only at the load (every pane starts at
 * the position of its group, which the slice grids give before any pane
 * mounts), the panes of a group show one scale, and a zoom or a resize of the
 * PET pane leaves the slice of the CT pane where it is.
 */
for (let load = 1; load <= 5; load++) {
  test(`the panes of a sync group open on the slice of the CT, load ${load}`, async ({ page }) => {
    await page.addInitScript(() => {
      const newImages: Record<string, number[]> = {};
      (window as unknown as { __newImageSlices: typeof newImages }).__newImageSlices = newImages;
      document.addEventListener(
        'CORNERSTONE_NEW_IMAGE',
        (evt: CustomEvent) => {
          const { viewportId, sliceIndex, imageIdIndex } = evt.detail ?? {};
          if (viewportId) {
            (newImages[viewportId] ||= []).push(sliceIndex ?? imageIdIndex);
          }
        },
        true
      );
    });
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

    const panes = await readPanes(page);

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
        expect(pane.parallelScale, `${name}: ${id} shows the scale of the CT pane`).toBeCloseTo(
          ct.parallelScale,
          3
        );
      }
    }

    const newImageSlices: Record<string, number[]> = await page.evaluate(
      () => (window as unknown as { __newImageSlices: Record<string, number[]> }).__newImageSlices
    );
    for (const id of PANE_IDS) {
      expect([...new Set(newImageSlices[id])], `${id} reports one slice only at the load`).toEqual([
        panes[id].sliceIndex,
      ]);
    }

    await page.evaluate(() => {
      const engine = (window as any).services.cornerstoneViewportService.getRenderingEngine();
      const pt = engine.getViewport('ptSAGITTAL');
      pt.setZoom(pt.getZoom() * 1.5);
      pt.render();
    });
    await page.waitForTimeout(1000);
    const afterZoom = await readPanes(page);
    expect(afterZoom.ctSAGITTAL.sliceIndex, 'a zoom of the PET pane keeps the CT slice').toBe(
      panes.ctSAGITTAL.sliceIndex
    );
    expect(afterZoom.ctSAGITTAL.parallelScale).toBeCloseTo(afterZoom.ptSAGITTAL.parallelScale, 3);

    const size = page.viewportSize();
    await page.setViewportSize({ width: size.width - 200, height: size.height });
    await page.waitForTimeout(2500);
    const afterResize = await readPanes(page);
    expect(afterResize.ctSAGITTAL.sliceIndex, 'a resize of the PET pane keeps the CT slice').toBe(
      panes.ctSAGITTAL.sliceIndex
    );
    expect(afterResize.ctSAGITTAL.parallelScale).toBeCloseTo(
      afterResize.ptSAGITTAL.parallelScale,
      3
    );
  });
}
