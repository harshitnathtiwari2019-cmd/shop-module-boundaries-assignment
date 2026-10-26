/**
 * An in-process event bus.
 *
 * Requirements:
 * - A handler that throws must not stop other handlers.
 * - publish() returns the number of handlers it reached.
 * - Subscribing the same function twice registers it twice.
 * - Publishing an event with no subscribers is allowed and returns 0.
 */

export interface DomainEvents {
  "order.placed": {
    orderId: string;
    email: string;
    amountPaise: number;
  };
}

export type EventName = keyof DomainEvents;

export type Handler<K extends EventName> = (payload: DomainEvents[K]) => void;

export type Unsubscribe = () => void;

export interface EventBus {
  publish<K extends EventName>(name: K, payload: DomainEvents[K]): number;

  subscribe<K extends EventName>(name: K, fn: Handler<K>): Unsubscribe;
}

export function createEventBus(): EventBus {
  const handlers = new Map<EventName, Handler<EventName>[]>();

  function subscribe<K extends EventName>(
    name: K,
    fn: Handler<K>,
  ): Unsubscribe {
    const eventHandlers = handlers.get(name) ?? [];

    // Keep duplicate registrations; do not deduplicate handlers.
    eventHandlers.push(fn as Handler<EventName>);
    handlers.set(name, eventHandlers);

    // Return a function that unregisters this specific subscription.
    return () => {
      const currentHandlers = handlers.get(name);

      if (!currentHandlers) {
        return;
      }

      const index = currentHandlers.indexOf(fn as Handler<EventName>);

      if (index !== -1) {
        currentHandlers.splice(index, 1);
      }

      if (currentHandlers.length === 0) {
        handlers.delete(name);
      }
    };
  }

  function publish<K extends EventName>(
    name: K,
    payload: DomainEvents[K],
  ): number {
    const eventHandlers = handlers.get(name) ?? [];

    // Snapshot the handlers so subscription changes during delivery
    // do not change which handlers this publication reaches.
    const currentHandlers = [...eventHandlers];

    let reached = 0;

    for (const handler of currentHandlers) {
      reached++;

      try {
        handler(payload);
      } catch {
        // An error in one handler must not stop other handlers.
      }
    }

    return reached;
  }

  return {
    subscribe,
    publish,
  };
}
