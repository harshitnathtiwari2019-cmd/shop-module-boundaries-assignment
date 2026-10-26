import { outbox, type Message } from "./repo.ts";
import { orderEventBus } from "../orders/index.ts";

let n = 0;

export function send(to: string, subject: string): string {
  const id = `msg_${++n}`;

  outbox().set(id, { id, to, subject });

  return id;
}

// Subscribe to successful order events.
orderEventBus.subscribe("order.placed", (payload) => {
  send(payload.email, "Order confirmation");
});

export function sent(): Message[] {
  return [...outbox().values()];
}
