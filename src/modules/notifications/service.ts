import { outbox, type Message } from "./repo.ts";
import { orderEventBus } from "../orders/service.ts";

let n = 0;

// Subscribe to successful order events.
orderEventBus.subscribe("order.placed", (payload) => {
  send(payload.email, `Order ${payload.orderId} confirmed`);
});

export function send(to: string, subject: string): string {
  const id = `msg_${++n}`;
  outbox().set(id, { id, to, subject });
  return id;
}

export function sent(): Message[] {
  return [...outbox().values()];
}
