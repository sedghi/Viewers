---
sidebar_position: 18
sidebar_label: Toolbar update registrations
title: registerEventForToolbarUpdate returns its release
---

# `registerEventForToolbarUpdate` returns its release

`toolbarService.registerEventForToolbarUpdate(service, events)` refreshes the toolbar
when one of the events fires. In 3.13 it returned nothing and its listeners stayed for
the life of the page: an extension that registered in `onModeEnter` added one more
listener at each entry into a mode (leaving for the study list and opening a study
again), and each event then refreshed the toolbar once per entry. For an event target
with `addEventListener` (the `eventTarget` of Cornerstone3D) there was no way to remove
the listener at all.

In 3.14 the call returns a function that removes every listener it added, for a pub-sub
service (`subscribe`) and for an event target (`addEventListener`) alike. The field
`_serviceSubscriptions` of the service, which kept those registrations and was never
read, is removed.

**Before (3.13):**

```ts
onModeEnter({ servicesManager }) {
  const { toolbarService, cornerstoneViewportService } = servicesManager.services;

  toolbarService.registerEventForToolbarUpdate(cornerstoneViewportService, [
    cornerstoneViewportService.EVENTS.VIEWPORT_DATA_CHANGED,
  ]);
},
```

**After (3.14):**

```ts
const unsubscriptions: Array<() => void> = [];

const extension = {
  onModeEnter({ servicesManager }) {
    const { toolbarService, cornerstoneViewportService } = servicesManager.services;

    unsubscriptions.push(
      toolbarService.registerEventForToolbarUpdate(cornerstoneViewportService, [
        cornerstoneViewportService.EVENTS.VIEWPORT_DATA_CHANGED,
      ])
    );
  },

  onModeExit() {
    unsubscriptions.forEach(unsubscribe => unsubscribe());
    unsubscriptions.length = 0;
  },
};
```

## What you need to change

- A registration made in `onModeEnter` (of an extension or of a mode): keep the
  returned function and call it in `onModeExit`. The cornerstone and the measurement
  tracking extensions do so now.
- A registration made once at the init of the app (`preRegistration`, the `init` of an
  extension, as the default extension does for the cine and the hotkeys): nothing to
  change, it lives as long as the app.
- Code that read `toolbarService._serviceSubscriptions`: keep the functions that
  `registerEventForToolbarUpdate` returns instead.
