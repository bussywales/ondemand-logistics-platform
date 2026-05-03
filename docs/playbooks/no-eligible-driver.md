# No Eligible Driver

## Trigger
- Dispatch or manual assignment review shows no eligible courier can currently take the job.

## How to identify it in ShipWright
- Job detail shows dispatch failure or assignment blocker.
- Daily briefing or job detail may show a deterministic `Review driver pool` suggestion with evidence such as eligible-driver count and offer state.
- Driver assignment picker shows blocked candidates or an empty eligible list.
- `/driver` shows no approved/online staged courier for the route.

## Immediate operator action
1. Confirm required vehicle type on the job.
2. Confirm at least one approved driver is online.
3. Confirm candidate drivers are not already active on another job.
4. Confirm the nearest staged driver has recent location availability if expected.
5. Retry dispatch only after the underlying eligibility issue changes.
6. Do not treat the suggestion surface as automatic assignment logic. It is a human-reviewed recovery aid only.

## Customer/restaurant communication guidance
- Tell the restaurant courier capacity is temporarily constrained.
- Tell the customer dispatch is delayed because no suitable courier is currently available.

## Admin checks
- Use `/admin` to see whether this is isolated or part of a wider driver-pool issue.
- Verify notifications/outbox are not masking a real assignment that already happened.

## When to cancel/refund
- Cancel/refund only after confirming there is no reasonable reassignment path in the pilot window.

## Escalation owner
- Business operator for local pool check.
- Platform admin if the staged driver pool or approval state looks globally wrong.

## Evidence to record
- job id
- vehicle required
- list of blocked suitability reasons
- online driver count checked
- final retry/cancel/escalate decision
