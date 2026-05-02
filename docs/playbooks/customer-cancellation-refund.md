# Customer Cancellation and Refund

## Trigger
- Customer asks to cancel, or operations decide the order cannot be fulfilled and a refund path is required.

## How to identify it in ShipWright
- Order is still open or blocked in `/app/orders/[orderId]`.
- Job is not yet successfully fulfilled.
- Payment state must be reviewed before any customer promise is made.

## Immediate operator action
1. Confirm current order, job, and payment status.
2. Determine whether cancellation is still operationally safe.
3. Identify whether payment is authorized only or already captured.
4. Record who approved the cancellation/refund decision.
5. Complete the supported product action path and note any manual follow-up required.

## Customer/restaurant communication guidance
- Tell the customer whether cancellation is accepted and whether refund is pending or completed.
- Tell the restaurant whether preparation/delivery should stop immediately.

## Admin checks
- Confirm payment status, outbox state, and any related timeline events.
- Check whether external notification or refund follow-up needs manual confirmation.

## When to cancel/refund
- Cancel when the order has not been fulfilled and continuing would be incorrect or impossible.
- Refund based on current payment state and approved pilot policy.

## Escalation owner
- Business operator with approval trail.
- Platform admin if payment capture/refund state is unclear or unsupported by current tooling.

## Evidence to record
- order id
- payment id and status
- refund/cancel approval owner
- customer request timestamp
- final customer communication
