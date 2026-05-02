# Manual Reassignment

## Trigger
- Dispatch failed, or an assigned driver can no longer complete the job, and an operator must choose a replacement driver manually.

## How to identify it in ShipWright
- `/app/jobs/[jobId]` offers the driver assignment picker.
- Eligible driver list shows one or more assignable candidates.
- Existing assigned driver is absent, blocked, or non-performing.

## Immediate operator action
1. Open the driver assignment picker.
2. Prefer eligible drivers with the correct vehicle, active approval, and online availability.
3. Read blocked suitability reasons before choosing a fallback.
4. Assign the replacement driver.
5. Refresh job detail and confirm the assignment state changed.

## Customer/restaurant communication guidance
- Tell the restaurant and customer the courier assignment changed if it affects ETA materially.
- Do not claim live tracking movement until the replacement driver actually progresses the job.

## Admin checks
- If no driver is eligible, fall back to the no-eligible-driver playbook.
- If reassignment succeeds but the job still does not move, inspect driver execution or outbox/notification state.

## When to cancel/refund
- Cancel only if no replacement driver can safely take the job in time.

## Escalation owner
- Business operator.
- Platform admin if eligibility logic and visible driver state disagree.

## Evidence to record
- previous driver id if any
- replacement driver id
- suitability reasons reviewed
- assignment result
- updated ETA expectation
