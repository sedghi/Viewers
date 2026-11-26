import type { Page } from '@playwright/test';
import { expect, test, visitStudy, waitForViewportsRendered } from './utils';

/**
 * The opacity slider of a fusion (CT ---o PT) starts at the opacity that the
 * PET is drawn with, the strongest alpha of its ramp, and one step of it
 * changes that opacity by one step. The TMTV fusion panes draw their PET with
 * an alpha of at most 0.2501, the look of 3.13; a PET added from the data
 * overlay menu over a CT is drawn with 0.25.
 */

const opacitySlider = (page: Page) =>
  page
    .locator('[data-radix-popper-content-wrapper]')
    .filter({ hasText: 'Opacity' })
    .getByRole('slider');

const sliderValue = async (page: Page) =>
  Number(await opacitySlider(page).getAttribute('aria-valuenow'));

/**
 * The effective opacity of the PET of a pane and the highest point of its
 * opacity ramp.
 */
const readPET = (page: Page, viewportId: string) =>
  page.evaluate(id => {
    const { viewportGridService, displaySetService, cornerstoneViewportService } = (window as any)
      .services;
    const uid = viewportGridService
      .getState()
      .viewports.get(id)
      .displaySetInstanceUIDs.find(
        displaySetUID => displaySetService.getDisplaySetByUID(displaySetUID)?.Modality === 'PT'
      );
    const appearance = cornerstoneViewportService
      .getCornerstoneViewport(id)
      .getEffectiveDisplaySetAppearance(uid);
    const ramp = appearance.colormap?.opacityMapping ?? [];

    return {
      opacity: appearance.opacity,
      highestPoint: ramp.length ? Math.max(...ramp.map(point => point.opacity)) : undefined,
    };
  }, viewportId);

/**
 * Opens the opacity menu of a pane as a user does: the colour bar on from the
 * window level menu (the controls at the bottom of the pane show with it),
 * then the opacity button there.
 */
async function openOpacityMenu(page: Page, viewportId: string) {
  const pane = page
    .getByTestId('viewport-pane')
    .filter({ has: page.locator(`[data-viewport-uid="${viewportId}"]`) });
  await pane.hover();
  await pane.getByTestId('windowLevelMenu-btn').click();
  await page.getByRole('dialog').getByText('Color bar').click();
  await page.keyboard.press('Escape');
  const box = await pane.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 30);
  await pane.getByTestId('opacityMenu-btn').click();
  await expect(opacitySlider(page)).toBeVisible();
}

async function stepRight(page: Page) {
  await opacitySlider(page).focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(500);
}

test('the opacity slider of a TMTV fusion pane starts at the opacity of its PET', async ({
  page,
}) => {
  await visitStudy(page, '1.2.840.113619.2.290.3.3767434740.226.1600859119.501', 'tmtv', 2000);
  await waitForViewportsRendered(page, { timeout: 120000 });

  await openOpacityMenu(page, 'fusionAXIAL');

  expect(await sliderValue(page)).toBeCloseTo(0.2501, 4);
  const atStart = await readPET(page, 'fusionAXIAL');
  expect(atStart.opacity).toBeCloseTo(0.2501, 4);
  expect(atStart.highestPoint).toBe(1);

  await stepRight(page);

  expect(await sliderValue(page)).toBeCloseTo(0.2502, 4);
  const afterStep = await readPET(page, 'fusionAXIAL');
  expect(afterStep.opacity).toBeCloseTo(0.2502, 4);
  expect(afterStep.highestPoint).toBe(1);
});

test('the opacity slider of a PET added from the data overlay menu starts at its opacity', async ({
  page,
}) => {
  await visitStudy(page, '1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463');
  await waitForViewportsRendered(page, { timeout: 120000 });

  await page.evaluate(() => {
    const { services, commandsManager } = window as any;
    const { displaySetService, viewportGridService, hangingProtocolService } = services;
    const displaySets = displaySetService.getActiveDisplaySets();
    const ct = displaySets.find(
      displaySet => displaySet.Modality === 'CT' && displaySet.SeriesDescription === 'CT IMAGES'
    );
    const viewportId = viewportGridService.getActiveViewportId();
    commandsManager.run('setDisplaySetsForViewports', {
      viewportsToUpdate: hangingProtocolService.getViewportsRequireUpdate(
        viewportId,
        ct.displaySetInstanceUID
      ),
    });
  });
  await waitForViewportsRendered(page, { timeout: 120000 });

  await page.evaluate(() => {
    const { services, commandsManager } = window as any;
    const pt = services.displaySetService
      .getActiveDisplaySets()
      .find(displaySet => displaySet.SeriesDescription === 'PET AC');
    commandsManager.runCommand('addDisplaySetAsLayer', {
      viewportId: services.viewportGridService.getActiveViewportId(),
      displaySetInstanceUID: pt.displaySetInstanceUID,
    });
  });
  await page.waitForTimeout(1000);
  await waitForViewportsRendered(page, { timeout: 120000 });

  await openOpacityMenu(page, 'default');

  expect(await sliderValue(page)).toBeCloseTo(0.25, 4);
  expect((await readPET(page, 'default')).opacity).toBeCloseTo(0.25, 4);

  await stepRight(page);

  expect(await sliderValue(page)).toBeCloseTo(0.2501, 4);
  expect((await readPET(page, 'default')).opacity).toBeCloseTo(0.2501, 4);
});
