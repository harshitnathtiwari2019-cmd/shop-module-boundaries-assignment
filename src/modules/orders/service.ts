import { orders, type Order } from "./repo.ts";
import { reserve } from "../inventory/index.ts";
import { charge } from "../payments/index.ts";
import { createEventBus } from "../../platform/event-bus.ts";

export const orderEventBus = createEventBus();

export type PlaceResult =
  | { ok: true; orderId: string; amountPaise: number }
  | { ok: false; reason: string };

export interface PlaceInput {
  sku: string;
  qty: number;
  unitPaise: number;
  email: string;
}

export function placeOrder({
  sku,
  qty,
  unitPaise,
  email,
}: PlaceInput): PlaceResult {
  const reservation = reserve(sku, qty);

  if (!reservation.ok) {
    return { ok: false, reason: reservation.reason };
  }

  const amountPaise = qty * unitPaise;
  const payment = charge("pending", amountPaise);

  if (!payment.ok) {
    return { ok: false, reason: payment.reason };
  }

  const id = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  orders().set(id, {
    id,
    sku,
    qty,
    amountPaise,
    chargeId: payment.chargeId,
  });

  orderEventBus.publish("order.placed", {
    orderId: id,
    email,
    amountPaise,
  });

  return { ok: true, orderId: id, amountPaise };
}

export function get(id: string): Order | null {
  return orders().get(id) ?? null;
}
