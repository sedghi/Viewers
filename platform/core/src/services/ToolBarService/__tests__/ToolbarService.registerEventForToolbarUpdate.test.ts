import ToolbarService from '../ToolbarService';
import { PubSubService } from '../../_shared/pubSubServiceInterface';

const EVENTS = { CHANGED: 'event::changed', OTHER: 'event::other' };

class FakePubSubService extends PubSubService {
  constructor() {
    super(EVENTS);
  }

  fire(eventName: string) {
    this._broadcastEvent(eventName, {});
  }
}

/**
 * An event target that counts its listeners, as the `eventTarget` of Cornerstone3D
 * keeps them: by type, in a plain object of arrays.
 */
class CountingEventTarget {
  listeners: Record<string, Array<() => void>> = {};

  addEventListener(type: string, callback: () => void) {
    this.listeners[type] = [...(this.listeners[type] ?? []), callback];
  }

  removeEventListener(type: string, callback: () => void) {
    this.listeners[type] = (this.listeners[type] ?? []).filter(listener => listener !== callback);
  }

  dispatch(type: string) {
    (this.listeners[type] ?? []).forEach(listener => listener());
  }

  count() {
    return Object.values(this.listeners).reduce((total, list) => total + list.length, 0);
  }
}

function listenerCount(service: PubSubService) {
  return Object.values(service.listeners).reduce((total, list) => total + (list?.length ?? 0), 0);
}

function createToolbarService() {
  const servicesManager = {
    services: { viewportGridService: { getActiveViewportId: () => 'viewport' } },
  };
  const toolbarService = new ToolbarService({} as never, {} as never, servicesManager as never);
  const refresh = jest
    .spyOn(toolbarService, 'refreshToolbarState')
    .mockImplementation(() => undefined);

  return { toolbarService, refresh };
}

describe('ToolbarService.registerEventForToolbarUpdate', () => {
  it('refreshes the toolbar on an event of a pub-sub service until it is released', () => {
    const { toolbarService, refresh } = createToolbarService();
    const service = new FakePubSubService();

    const release = toolbarService.registerEventForToolbarUpdate(service, [
      EVENTS.CHANGED,
      EVENTS.OTHER,
    ]);
    service.fire(EVENTS.CHANGED);
    service.fire(EVENTS.OTHER);
    release();
    service.fire(EVENTS.CHANGED);

    expect(refresh).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenCalledWith({ viewportId: 'viewport' });
    expect(listenerCount(service)).toBe(0);
  });

  it('refreshes the toolbar on an event of an event target until it is released', () => {
    const { toolbarService, refresh } = createToolbarService();
    const target = new CountingEventTarget();

    const release = toolbarService.registerEventForToolbarUpdate(target, [EVENTS.CHANGED]);
    target.dispatch(EVENTS.CHANGED);
    release();
    target.dispatch(EVENTS.CHANGED);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(target.count()).toBe(0);
  });

  it('keeps one listener on each target over five mode entries and exits', () => {
    const { toolbarService, refresh } = createToolbarService();
    const service = new FakePubSubService();
    const target = new CountingEventTarget();
    const counts = [];

    for (let entry = 0; entry < 5; entry++) {
      const releases = [
        toolbarService.registerEventForToolbarUpdate(service, [EVENTS.CHANGED]),
        toolbarService.registerEventForToolbarUpdate(target, [EVENTS.CHANGED]),
      ];
      counts.push([listenerCount(service), target.count()]);
      releases.forEach(release => release());
    }
    refresh.mockClear();
    service.fire(EVENTS.CHANGED);
    target.dispatch(EVENTS.CHANGED);

    expect(counts).toEqual(Array(5).fill([1, 1]));
    expect(refresh).not.toHaveBeenCalled();
  });
});
