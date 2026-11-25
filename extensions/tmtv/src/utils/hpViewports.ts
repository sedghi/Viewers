/**
 * The opacities by SUV of the PET over the CT of the fusion panes. They are the
 * ramp of OHIF 3.13 (0 at SUV 0, 0.8 at 0.1, 0.9 from 1 on) as the legacy
 * volume viewport of Cornerstone3D 5.x drew it: each opacity `a` as
 * `1 - (1 - a) ** 0.125`, the exponent of its blend for the volumes of a
 * PET/CT study. Cornerstone3D 6.0 draws an opacity as it is given, so the
 * fusion keeps the look of 3.13 with these weaker points; the opacity slider
 * scales them. Measured on the study "LUNG DELAYS": the fusion panes are
 * within 3 levels of 255 of 3.13 on 99% of their pixels.
 */
const FUSION_PT_OPACITY_MAPPING = [
  { value: 0, opacity: 0 },
  { value: 0.0125, opacity: 0.0131 },
  { value: 0.025, opacity: 0.0275 },
  { value: 0.0375, opacity: 0.0436 },
  { value: 0.05, opacity: 0.0619 },
  { value: 0.0625, opacity: 0.083 },
  { value: 0.075, opacity: 0.1082 },
  { value: 0.0875, opacity: 0.1397 },
  { value: 0.1, opacity: 0.1822 },
  { value: 0.325, opacity: 0.1958 },
  { value: 0.55, opacity: 0.2111 },
  { value: 0.775, opacity: 0.2289 },
  { value: 1, opacity: 0.2501 },
];

// Common sync group configurations
const cameraPositionSync = (id: string) => ({
  type: 'cameraPosition',
  id,
  source: true,
  target: true,
});

const hydrateSegSync = {
  type: 'hydrateseg',
  id: 'sameFORId',
  source: true,
  target: true,
  options: {
    matchingRules: ['sameFOR'],
  },
};

const ctAXIAL: AppTypes.HangingProtocol.Viewport = {
  viewportOptions: {
    viewportId: 'ctAXIAL',
    viewportType: 'volume',
    orientation: 'axial',
    toolGroupId: 'ctToolGroup',
    initialImageOptions: {
      // index: 5,
      preset: 'first', // 'first', 'last', 'middle'
    },
    syncGroups: [
      cameraPositionSync('axialSync'),
      {
        type: 'voi',
        id: 'ctWLSync',
        source: true,
        target: true,
        options: {
          syncColormap: true,
        },
      },
      hydrateSegSync,
    ],
  },
  displaySets: [
    {
      id: 'ctDisplaySet',
    },
  ],
};

const ctSAGITTAL: AppTypes.HangingProtocol.Viewport = {
  viewportOptions: {
    viewportId: 'ctSAGITTAL',
    viewportType: 'volume',
    orientation: 'sagittal',
    toolGroupId: 'ctToolGroup',
    syncGroups: [
      cameraPositionSync('sagittalSync'),
      {
        type: 'voi',
        id: 'ctWLSync',
        source: true,
        target: true,
        options: {
          syncColormap: true,
        },
      },
      hydrateSegSync,
    ],
  },
  displaySets: [
    {
      id: 'ctDisplaySet',
    },
  ],
};

const ctCORONAL: AppTypes.HangingProtocol.Viewport = {
  viewportOptions: {
    viewportId: 'ctCORONAL',
    viewportType: 'volume',
    orientation: 'coronal',
    toolGroupId: 'ctToolGroup',
    syncGroups: [
      cameraPositionSync('coronalSync'),
      {
        type: 'voi',
        id: 'ctWLSync',
        source: true,
        target: true,
        options: {
          syncColormap: true,
        },
      },
      hydrateSegSync,
    ],
  },
  displaySets: [
    {
      id: 'ctDisplaySet',
    },
  ],
};

const ptAXIAL: AppTypes.HangingProtocol.Viewport = {
  viewportOptions: {
    viewportId: 'ptAXIAL',
    viewportType: 'volume',
    background: [1, 1, 1],
    orientation: 'axial',
    toolGroupId: 'ptToolGroup',
    initialImageOptions: {
      // index: 5,
      preset: 'first', // 'first', 'last', 'middle'
    },
    syncGroups: [
      cameraPositionSync('axialSync'),
      {
        type: 'voi',
        id: 'ptWLSync',
        source: true,
        target: true,
        options: {
          syncColormap: true,
        },
      },
      {
        type: 'voi',
        id: 'ptFusionWLSync',
        source: true,
        target: false,
        options: {
          syncColormap: false,
          syncInvertState: false,
        },
      },
      hydrateSegSync,
    ],
  },
  displaySets: [
    {
      options: {
        voi: {
          custom: 'getPTVOIRange',
        },
        voiInverted: true,
      },
      id: 'ptDisplaySet',
    },
  ],
};

const ptSAGITTAL: AppTypes.HangingProtocol.Viewport = {
  viewportOptions: {
    viewportId: 'ptSAGITTAL',
    viewportType: 'volume',
    orientation: 'sagittal',
    background: [1, 1, 1],
    toolGroupId: 'ptToolGroup',
    syncGroups: [
      cameraPositionSync('sagittalSync'),
      {
        type: 'voi',
        id: 'ptWLSync',
        source: true,
        target: true,
        options: {
          syncColormap: true,
        },
      },
      {
        type: 'voi',
        id: 'ptFusionWLSync',
        source: true,
        target: false,
        options: {
          syncColormap: false,
          syncInvertState: false,
        },
      },
      hydrateSegSync,
    ],
  },
  displaySets: [
    {
      options: {
        voi: {
          custom: 'getPTVOIRange',
        },
        voiInverted: true,
      },
      id: 'ptDisplaySet',
    },
  ],
};

const ptCORONAL: AppTypes.HangingProtocol.Viewport = {
  viewportOptions: {
    viewportId: 'ptCORONAL',
    viewportType: 'volume',
    orientation: 'coronal',
    background: [1, 1, 1],
    toolGroupId: 'ptToolGroup',
    syncGroups: [
      cameraPositionSync('coronalSync'),
      {
        type: 'voi',
        id: 'ptWLSync',
        source: true,
        target: true,
        options: {
          syncColormap: true,
        },
      },
      {
        type: 'voi',
        id: 'ptFusionWLSync',
        source: true,
        target: false,
        options: {
          syncColormap: false,
          syncInvertState: false,
        },
      },
      hydrateSegSync,
    ],
  },
  displaySets: [
    {
      options: {
        voi: {
          custom: 'getPTVOIRange',
        },
        voiInverted: true,
      },
      id: 'ptDisplaySet',
    },
  ],
};

const fusionAXIAL: AppTypes.HangingProtocol.Viewport = {
  viewportOptions: {
    viewportId: 'fusionAXIAL',
    viewportType: 'volume',
    orientation: 'axial',
    toolGroupId: 'fusionToolGroup',
    initialImageOptions: {
      // index: 5,
      preset: 'first', // 'first', 'last', 'middle'
    },
    syncGroups: [
      cameraPositionSync('axialSync'),
      {
        type: 'voi',
        id: 'ctWLSync',
        source: false,
        target: true,
      },
      {
        type: 'voi',
        id: 'fusionWLSync',
        source: true,
        target: true,
        options: {
          syncColormap: true,
        },
      },
      {
        type: 'voi',
        id: 'ptFusionWLSync',
        source: false,
        target: true,
        options: {
          syncColormap: false,
          syncInvertState: false,
        },
      },
      hydrateSegSync,
    ],
  },
  displaySets: [
    {
      id: 'ctDisplaySet',
    },
    {
      id: 'ptDisplaySet',
      options: {
        colormap: {
          name: 'hsv',
          opacityMapping: FUSION_PT_OPACITY_MAPPING,
        },
        voi: {
          custom: 'getPTVOIRange',
        },
      },
    },
  ],
};

const fusionSAGITTAL = {
  viewportOptions: {
    viewportId: 'fusionSAGITTAL',
    viewportType: 'volume',
    orientation: 'sagittal',
    toolGroupId: 'fusionToolGroup',
    // initialImageOptions: {
    //   index: 180,
    //   preset: 'middle', // 'first', 'last', 'middle'
    // },
    syncGroups: [
      cameraPositionSync('sagittalSync'),
      {
        type: 'voi',
        id: 'ctWLSync',
        source: false,
        target: true,
      },
      {
        type: 'voi',
        id: 'fusionWLSync',
        source: true,
        target: true,
        options: {
          syncColormap: true,
        },
      },
      {
        type: 'voi',
        id: 'ptFusionWLSync',
        source: false,
        target: true,
        options: {
          syncColormap: false,
          syncInvertState: false,
        },
      },
      hydrateSegSync,
    ],
  },
  displaySets: [
    {
      id: 'ctDisplaySet',
    },
    {
      id: 'ptDisplaySet',
      options: {
        colormap: {
          name: 'hsv',
          opacityMapping: FUSION_PT_OPACITY_MAPPING,
        },
        voi: {
          custom: 'getPTVOIRange',
        },
      },
    },
  ],
};

const fusionCORONAL = {
  viewportOptions: {
    viewportId: 'fusionCoronal',
    viewportType: 'volume',
    orientation: 'coronal',
    toolGroupId: 'fusionToolGroup',
    // initialImageOptions: {
    //   index: 180,
    //   preset: 'middle', // 'first', 'last', 'middle'
    // },
    syncGroups: [
      cameraPositionSync('coronalSync'),
      {
        type: 'voi',
        id: 'ctWLSync',
        source: false,
        target: true,
      },
      {
        type: 'voi',
        id: 'fusionWLSync',
        source: true,
        target: true,
        options: {
          syncColormap: true,
        },
      },
      {
        type: 'voi',
        id: 'ptFusionWLSync',
        source: false,
        target: true,
        options: {
          syncColormap: false,
          syncInvertState: false,
        },
      },
      hydrateSegSync,
    ],
  },
  displaySets: [
    {
      id: 'ctDisplaySet',
    },
    {
      id: 'ptDisplaySet',
      options: {
        colormap: {
          name: 'hsv',
          opacityMapping: FUSION_PT_OPACITY_MAPPING,
        },
        voi: {
          custom: 'getPTVOIRange',
        },
      },
    },
  ],
};

const mipSAGITTAL: AppTypes.HangingProtocol.Viewport = {
  viewportOptions: {
    viewportId: 'mipSagittal',
    viewportType: 'volume',
    orientation: 'sagittal',
    background: [1, 1, 1],
    toolGroupId: 'mipToolGroup',
    syncGroups: [
      {
        type: 'voi',
        id: 'ptWLSync',
        source: true,
        target: true,
        options: {
          syncColormap: true,
        },
      },
      {
        type: 'voi',
        id: 'ptFusionWLSync',
        source: true,
        target: false,
        options: {
          syncColormap: false,
          syncInvertState: false,
        },
      },
      hydrateSegSync,
    ],

    // Custom props can be used to set custom properties which extensions
    // can react on.
    customViewportProps: {
      // We use viewportDisplay to filter the viewports which are displayed
      // in mip and we set the scrollbar according to their rotation index
      // in the cornerstone extension.
      hideOverlays: true,
    },
  },
  displaySets: [
    {
      options: {
        blendMode: 'MIP',
        slabThickness: 'fullVolume',
        voi: {
          custom: 'getPTVOIRange',
        },
        voiInverted: true,
      },
      id: 'ptDisplaySet',
    },
  ],
};

export {
  ctAXIAL,
  ctSAGITTAL,
  ctCORONAL,
  ptAXIAL,
  ptSAGITTAL,
  ptCORONAL,
  fusionAXIAL,
  fusionSAGITTAL,
  fusionCORONAL,
  mipSAGITTAL,
};
