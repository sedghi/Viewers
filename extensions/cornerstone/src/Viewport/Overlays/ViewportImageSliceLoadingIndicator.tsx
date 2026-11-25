// React Compiler opt-out: this file reads and mutates external cornerstone3D
// state (the enabled element, the camera, GL actors) during render and from
// imperative event handlers. The compiler's memoization assumes referential
// purity, so compiling it silently drops updates.
'use no memo';

import React, { useEffect, useState, useRef } from 'react';
import { Enums, getEnabledElement } from '@cornerstonejs/core';
import type { PlanarViewport } from '@cornerstonejs/core';
import { getViewportAdapter } from '../../services/ViewportService/adapter';

/**
 * The stack viewport of an element, or undefined when the element shows
 * something else (a volume, a video) or nothing yet.
 */
function getStackViewport(element: HTMLDivElement): PlanarViewport | undefined {
  const viewport = getEnabledElement(element)?.viewport;

  if (!viewport || getViewportAdapter(viewport).getShape() !== 'stack') {
    return undefined;
  }

  return viewport as PlanarViewport;
}

function ViewportImageSliceLoadingIndicator({ viewportData, element }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const loadIndicatorRef = useRef(null);
  const imageIdToBeLoaded = useRef(null);
  const shownImageIdIndex = useRef<number | null>(null);

  /**
   * A scroll of a stack asks for another image: CAMERA_MODIFIED fires when the
   * index is asked for, and NEW_IMAGE when the image shows. A pan or a zoom
   * fires CAMERA_MODIFIED too and keeps the index, so it starts nothing.
   */
  const setLoadingState = () => {
    const viewport = getStackViewport(element);

    if (!viewport || viewport.getCurrentImageIdIndex() === shownImageIdIndex.current) {
      return;
    }

    clearTimeout(loadIndicatorRef.current);

    loadIndicatorRef.current = setTimeout(() => {
      setLoading(true);
    }, 50);
  };

  const setFinishLoadingState = evt => {
    clearTimeout(loadIndicatorRef.current);

    shownImageIdIndex.current = evt.detail.sliceIndex;
    setLoading(false);
  };

  const setErrorState = evt => {
    clearTimeout(loadIndicatorRef.current);

    if (imageIdToBeLoaded.current === evt.detail.imageId) {
      setError(evt.detail.error);
      imageIdToBeLoaded.current = null;
    }
  };

  useEffect(() => {
    shownImageIdIndex.current = getStackViewport(element)?.getCurrentImageIdIndex() ?? null;

    element.addEventListener(Enums.Events.CAMERA_MODIFIED, setLoadingState);
    element.addEventListener(Enums.Events.IMAGE_LOAD_FAILED, setErrorState);
    element.addEventListener(Enums.Events.NEW_IMAGE, setFinishLoadingState);

    return () => {
      element.removeEventListener(Enums.Events.CAMERA_MODIFIED, setLoadingState);

      element.removeEventListener(Enums.Events.NEW_IMAGE, setFinishLoadingState);

      element.removeEventListener(Enums.Events.IMAGE_LOAD_FAILED, setErrorState);
    };
  }, [element, viewportData]);

  if (error) {
    return (
      <>
        <div className="absolute top-0 left-0 h-full w-full bg-black opacity-50">
          <div className="transparent flex h-full w-full items-center justify-center">
            <p className="text-highlight text-xl font-light">
              <h4>Error Loading Image</h4>
              <p>An error has occurred.</p>
              <p>{error}</p>
            </p>
          </div>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      // IMPORTANT: we need to use the pointer-events-none class to prevent the loading indicator from
      // interacting with the mouse, since scrolling should propagate to the viewport underneath
      <div className="pointer-events-none absolute top-0 left-0 h-full w-full bg-black opacity-50">
        <div className="transparent flex h-full w-full items-center justify-center">
          <p className="text-highlight text-xl font-light">Loading...</p>
        </div>
      </div>
    );
  }

  return null;
}

export default ViewportImageSliceLoadingIndicator;
