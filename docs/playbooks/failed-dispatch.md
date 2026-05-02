# Failed Dispatch

## Trigger
- A delivery job reaches `DISPATCH_FAILED`.
- The order remains live but no courier has accepted or been assigned.

## How to identify it in ShipWright
- `/app` shows the job in `Needs Review`.
- `/app/jobs/[jobId]` decision surface shows dispatch failure or retry guidance.
- `/app/orders/[orderId]` shows the linked delivery as blocked.
- `/admin` intervention queue shows a dispatch-related item.

## Immediate operator action
1. Open the linked job.
2. Review latest dispatch attempts and current driver assignment state.
3. Check whether a staged driver is online and eligible.
4. Retry dispatch only if the underlying driver/availability issue has changed.
5. If a suitable driver exists but dispatch logic still failed, use the manual reassignment flow.

## Customer/restaurant communication guidance
- Tell the restaurant the order is paid but courier assignment is delayed.
- Tell the customer the delivery is delayed while courier assignment is being resolved.
- Do not promise an ETA unless a driver is actually assigned.

## Admin checks
- Review `/admin` for parallel dispatch failures across orgs.
- Check outbox health if downstream dispatch notifications look stale.
- Confirm worker/retry state if dispatch should have retried automatically.

## When to cancel/refund
- Cancel only if no driver can be secured inside the agreed pilot threshold.
- If the order cannot be fulfilled, coordinate cancellation and refund approval explicitly.

## Escalation owner
- Business operator first.
- Platform admin if cross-org, worker, or dispatch pool issues are suspected.

## Evidence to record
- job id
- order id
- dispatch attempts seen
- driver eligibility findings
- retry/reassign decision
- customer and restaurant communication timestamp
