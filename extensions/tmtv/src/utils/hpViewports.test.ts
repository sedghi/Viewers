import { fusionAXIAL, fusionCORONAL, fusionSAGITTAL } from './hpViewports';

/**
 * The opacity ramp of the PET of the fusion panes in OHIF 3.13, by SUV.
 */
const RAMP_OF_3_13 = [
  { value: 0, opacity: 0 },
  { value: 0.1, opacity: 0.8 },
  { value: 1, opacity: 0.9 },
];

/**
 * The alpha that the legacy volume viewport of Cornerstone3D 5.x drew the
 * ramp of 3.13 with at an SUV: the ramp's opacity `a` there, drawn as
 * `1 - (1 - a) ** 0.125`.
 */
function legacyAlpha(value: number): number {
  const index = RAMP_OF_3_13.findIndex(point => point.value >= value);
  if (index === -1) {
    return 1 - (1 - RAMP_OF_3_13[RAMP_OF_3_13.length - 1].opacity) ** 0.125;
  }
  if (index === 0) {
    return 1 - (1 - RAMP_OF_3_13[0].opacity) ** 0.125;
  }
  const low = RAMP_OF_3_13[index - 1];
  const high = RAMP_OF_3_13[index];
  const a =
    low.opacity + ((value - low.value) / (high.value - low.value)) * (high.opacity - low.opacity);
  return 1 - (1 - a) ** 0.125;
}

function ptOptions(viewport) {
  return viewport.displaySets.find(displaySet => displaySet.id === 'ptDisplaySet').options;
}

describe('the PET of the TMTV fusion panes', () => {
  const panes = [fusionAXIAL, fusionSAGITTAL, fusionCORONAL].map(viewport => [
    viewport.viewportOptions.viewportId,
    viewport,
  ]);

  it.each(panes)(
    '%s: the opacity of the display set is the strongest alpha drawn, the ramp is its shape',
    (_viewportId, viewport) => {
      const { opacity, colormap } = ptOptions(viewport);
      const highest = Math.max(...colormap.opacityMapping.map(point => point.opacity));

      expect(highest).toBe(1);
      expect(opacity).toBeCloseTo(legacyAlpha(1), 4);
    }
  );

  it.each(panes)(
    '%s: the opacity times the ramp is the look of 3.13 at every point of the ramp',
    (_viewportId, viewport) => {
      const { opacity, colormap } = ptOptions(viewport);

      expect(colormap.opacityMapping.length).toBeGreaterThan(2);
      colormap.opacityMapping.forEach(point => {
        expect(opacity * point.opacity).toBeCloseTo(legacyAlpha(point.value), 3);
      });
    }
  );
});
