import type { VolumeViewport3D } from '@cornerstonejs/core';

export const reduce3DViewportSize = async (page: any) => {
  await page.evaluate(
    ({ cornerstone }: AppTypes.Test) => {
      const enabledElement = cornerstone
        .getEnabledElements()
        .filter(element => element.viewport.type === 'volume3d')[0];
      const viewport = enabledElement.viewport as VolumeViewport3D;
      viewport.setZoom(0.5);
      viewport.render();
    },
    await page.evaluateHandle('window')
  );
};
