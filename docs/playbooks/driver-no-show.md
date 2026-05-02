# Driver No-Show

## Trigger
- A driver is assigned but does not progress toward pickup or stops responding during execution.

## How to identify it in ShipWright
- Job remains `ASSIGNED` or `EN_ROUTE_PICKUP` without meaningful progress.
- Tracking/timeline stops updating.
- Driver route panel shows stale or absent live signal after assignment.

## Immediate operator action
1. Confirm the job is truly assigned to a driver.
2. Review timeline timestamps and any latest location evidence.
3. Decide whether manual reassignment is safe.
4. If reassignment is needed, use the manual reassignment playbook.
5. If the order is no longer recoverable, move to cancellation/refund handling.

## Customer/restaurant communication guidance
- Tell the restaurant pickup is delayed due to courier execution failure.
- Tell the customer the courier did not progress and the team is actively recovering the job.

## Admin checks
- Check for multiple stalled jobs on the same driver.
- Confirm the driver profile and active-job state are still coherent.

## When to cancel/refund
- Cancel/refund when there is no replacement courier path or the delivery window is already breached.

## Escalation owner
- Business operator first.
- Platform admin if the same driver or execution issue appears across jobs.

## Evidence to record
- job id
- assigned driver id/name
- latest timeline timestamps
- reassignment/cancellation decision
- communication log
