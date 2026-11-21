/**
 * Halves the zoom of the first 3D viewport. A 3D viewport of Cornerstone3D 6
 * has no setZoom: its zoom is read and written through viewportProjection.
 */
export const reduce3DViewportSize = async (page: any) => {
  await page.evaluate(
    ({ cornerstone }: AppTypes.Test) => {
      const enabledElement = cornerstone
        .getEnabledElements()
        .filter(element => element.viewport.type === 'volume3d')[0];
      const { viewport } = enabledElement;
      const zoomed = cornerstone.viewportProjection.withPresentation(viewport, { zoom: 0.5 });

      if (!zoomed) {
        throw new Error('The 3D viewport has no data to zoom yet');
      }

      viewport.setViewState(zoomed);
      viewport.render();
    },
    await page.evaluateHandle('window')
  );
};
