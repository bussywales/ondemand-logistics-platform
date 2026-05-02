# Payment Authorized, Delivery Blocked

## Trigger
- Order is `PAYMENT_AUTHORIZED` but delivery cannot complete because dispatch or execution is blocked.

## How to identify it in ShipWright
- `/app/orders/[orderId]` shows payment authorized and fulfilment incomplete.
- `/app/jobs/[jobId]` shows delivery blocker such as dispatch failure or stalled execution.
- `/admin` may show both payment and intervention signals for the same order/job.

## Immediate operator action
1. Confirm payment really is only authorized, not captured.
2. Determine whether the blocker is dispatch, driver execution, or support escalation.
3. Decide quickly whether the job is still recoverable within the pilot service window.
4. If recoverable, keep the customer informed and continue operational recovery.
5. If not recoverable, move to cancellation/refund approval.

## Customer/restaurant communication guidance
- Tell the customer payment is only authorized and the delivery is being reviewed.
- Tell the restaurant whether to hold preparation, continue, or stop based on recovery likelihood.

## Admin checks
- Confirm payment status and linked job state match.
- Check whether capture has been requested unexpectedly.
- Review timeline and outbox records for contradictory downstream state.

## When to cancel/refund
- If fulfilment cannot continue safely or within the agreed pilot threshold, cancel and begin refund handling before capture occurs.

## Escalation owner
- Business operator for immediate decision.
- Platform admin if payment/job state is inconsistent or capture behavior is unclear.

## Evidence to record
- order id
- payment id and status
- job id and blocker state
- decision to continue recovery or cancel
- customer/restaurant communication log
