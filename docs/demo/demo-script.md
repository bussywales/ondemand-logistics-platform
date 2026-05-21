# Demo Script

## Objective
Walk a stakeholder through the current Stage 1 ShipWright loop without overstating what is production-ready.

## Setup
Have ready:
- latest release verification result
- latest paid-delivery proof artifact
- latest order id, job id, payment id, and POD id from the proof output
- seeded business operator session
- seeded driver session
- seeded platform admin session
- public restaurant route open in a clean tab

Minimum demo readiness standard:

```bash
pnpm release:verify-staging
pnpm proof:staging-paid-delivery
pnpm --filter @shipwright/web test:smoke
```

Use `demo-reset-checklist.md` before the session and `demo-known-limitations-talk-track.md` during Q&A.

## Step-By-Step Walkthrough

### 1. Public restaurant menu
Open:
- `https://ondemand-logistics-platform-web.vercel.app/restaurants/pilot-kitchen-1777370757`

Say:
- this is the branded public customer ordering surface
- menu and basket are real staging data, not mock cards

Show:
- restaurant identity
- live menu item list
- cart rail
- delivery detail form
- payment section

### 2. Place paid order
Use the public checkout flow.

Say:
- the customer authorises payment through Stripe test mode
- the order creates real downstream order, job, and payment records

Show:
- paid order submission
- successful order creation outcome

### 3. Customer success screen
Stay on the success state.

Show:
- order confirmation
- linked job/payment state tiles
- `Back to menu`
- `Track order` call to action

Say:
- the customer gets a clear next step immediately after order creation

### 4. Track order
Open the tracking route from the success screen, or use:
- `/track/<latestOrderId>`

Show:
- customer-ready tracking headline
- what-happens-next panel
- pickup -> courier -> drop-off progress view
- customer-friendly timeline
- calm support/help guidance

Say:
- tracking is progress/status based
- this is not a live map product yet
- the page does not expose driver private details or precise coordinates

### 5. Business orders queue
Open:
- `/app/orders`

Show:
- order-first queue
- payment state
- delivery state
- fulfilment state
- risk state
- customer total
- platform fee / driver payout when available
- order detail support and escalation log
- support history timeline for status, owner, contact, resolution, and reopen changes when a support record exists

Say:
- operators manage fulfilment and financial risk from one order surface
- Command Intelligence highlights risk and recommended next steps, but operators remain responsible for acting
- human support notes can be recorded against the order without sending messages or executing refunds automatically
- support history is append-only audit context; operators can see who changed what, when, and why

### 6. Payment risk page
Open:
- `/app/payments`

Show:
- risk-only lens over the order set
- no-risk or risk-bearing queue depending on current data

Say:
- this is not a finance ledger dashboard
- it is an operational payment risk surface tied to fulfilment

### 6A. End-of-day report
Open:
- `/app/reports/end-of-day`

Show:
- deterministic closeout headline
- operating summary
- payment and incident summaries
- unresolved actions with order/job/payment links

Say:
- this is a rules-based closeout report, not an AI autopilot
- operators still decide recovery, refunds, cancellations, and customer communication

### 6B. Daily briefing and command layer
Open:
- `/app`

Show:
- daily briefing
- recovery suggestions
- support follow-up posture
- links to orders, jobs, payment risk, support logs, and end-of-day report

Say:
- Command Intelligence v1 is deterministic and based on current operational signals
- it helps operators review recommendations, but does not take recovery actions automatically
- unresolved support records now contribute to the same command posture as dispatch, payment, and delay risk

### 7. Notifications
Open:
- `/app/notifications`

Show:
- recent grouped notifications
- persisted read state
- order/job-linked navigation

Say:
- this is for operational events, not release notes
- product updates live elsewhere under `/app/updates`

### 8. Driver route
Open:
- `/driver`

Show:
- online/offline state
- staged offer acceptance path
- job progression
- POD submission

Say:
- the driver route proves staged execution and delivery completion
- it is not yet a broad live-courier production app

### 9. Admin control plane
Open:
- `/admin`

Show:
- intervention queue
- active operations
- orders
- payment oversight
- driver readiness link
- outbox/health visibility

Say:
- platform admins can inspect cross-org operational posture from one surface
- courier approval remains human-led; ShipWright surfaces readiness signals but does not auto-approve drivers

### 9A. Admin command intelligence
Open:
- `/admin/command`

Show:
- cross-org command summary
- grouped attention queue
- incident intelligence
- end-of-day closeout preview
- read-only support escalation overview
- support escalation counts in the top command posture
- support records closed today in the closeout posture
- link to `/admin/menu-history` for read-only investigation of merchant menu edits across organisations

Say:
- this is deterministic command intelligence for platform oversight
- it helps admins spot which organisations need support without silently taking action
- support escalation visibility is oversight-only for admins in this pass; business operators still own direct follow-up unless delegated
- business operators close support records with a resolution note and final action; ShipWright records the support history as append-only audit context but does not message, refund, cancel, or assign automatically
- platform support can inspect menu change history for pilot troubleshooting, but admins cannot mutate or roll back merchant menus from the history view
- menu history now labels whether a change has enough structured metadata for rollback
- business operators can preview prepared rollback events and must type `ROLLBACK MENU CHANGE` before ShipWright restores the audited previous values
- rollback is human-reviewed and audit-backed; it does not delete menu records and remains unavailable from the admin cross-org history view

### 9B. Driver readiness
Open:
- `/admin/drivers`

Show:
- courier readiness status
- readiness counts for ready, needs review, and not eligible couriers
- verification, vehicle, online, location, and active-job checklist
- recommended next action for blocked couriers

Say:
- this is a read-only pilot control surface
- approval, courier communication, and eligibility decisions remain human responsibilities
- the surface is not a punitive driver score and does not approve, suspend, or assign couriers automatically

### 9C. Fleet companies
Open:
- `/admin/fleets`

Show:
- driver-company organisations
- ready, needs-review, and not-eligible courier counts
- managed courier list for a fleet
- fleet role and active membership controls
- independent vs fleet-managed courier affiliation from driver readiness

Say:
- fleets are management groups for courier pools
- independent couriers still work as individual driver profiles
- fleet membership does not change dispatch preference, payout, billing, suspension, or assignment automation in v1
- platform admins remain responsible for human compliance review and controlled pilot readiness

### 10. Playbooks and help
Open:
- `/help/pilot-operations`
- `docs/playbooks/README.md` if the repo is available in the session

Say:
- fallback and escalation paths are documented explicitly
- these are part of the controlled pilot discipline, not hidden tribal knowledge

### 11. Proof evidence
Reference the latest proof artifacts in `docs/proofs/`.

Call out:
- latest release verification artifact
- latest paid-delivery proof artifact
- final `DELIVERED`, `CAPTURED`, `FULFILLED` chain
- processed outbox signals including order, driver, delivery, and payment notifications

## Optional fallback path
If live ordering is unstable during the session:
- do not improvise or hide the issue
- switch to the latest proof order and tracking route
- continue the walkthrough from proof-backed states
- explicitly state that you are continuing from the latest verified staging proof rather than a fresh live order

## Close
End with:
- what is staging-proven
- what is still manually operated
- what is parked
- why the current state is appropriate for controlled demos and tightly managed testers, not open pilot traffic
