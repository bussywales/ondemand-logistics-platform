# Pilot Fallback Playbooks

These playbooks document the manual recovery path for common live-pilot failures in ShipWright.

Use them when the product surfaces a real operational blocker but ShipWright does not yet automate the recovery path.

## Playbooks
- [failed-dispatch.md](./failed-dispatch.md)
- [no-eligible-driver.md](./no-eligible-driver.md)
- [payment-authorized-delivery-blocked.md](./payment-authorized-delivery-blocked.md)
- [driver-no-show.md](./driver-no-show.md)
- [customer-cancellation-refund.md](./customer-cancellation-refund.md)
- [manual-reassignment.md](./manual-reassignment.md)
- [support-escalation.md](./support-escalation.md)

## How to use them
1. Identify the current blocker in `/app`, `/app/orders`, `/app/jobs/[jobId]`, `/driver`, or `/admin`.
2. Pick the single playbook that best matches the incident.
3. Follow the checks in order before changing state.
4. Record the evidence you used and who approved the decision.
5. If the playbook says to escalate, attach the evidence bundle before handing off.

## Evidence minimum
- order id
- job id
- payment id if linked
- current order/job/payment statuses
- relevant timeline events with timestamps
- current operator name
- action taken
- escalation owner if handed off
