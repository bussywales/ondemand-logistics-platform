# Known Limitations

## Current operating boundary
ShipWright is currently prepared for controlled staging demos and tightly managed internal testers.

It is not currently positioned as an open public pilot or unattended production service.

## Limitations
- staging only
- no open public pilot yet
- Resend outbound email delivery is parked until a verified sender/domain exists
- payment and payout are visibility-first, not full settlement automation
- tracking is progress/status based, not live map movement
- courier compliance ownership still needs a live operating owner outside the staging fixture model
- support/escalation logging is human-entered audit context; it does not send customer, merchant, or courier messages
- pilot workspace mode and readiness stage are admin-reviewed context signals in v1; they do not automatically disable ordering, dispatch, payment, or driver workflows
- proof artifacts are local generated evidence unless explicitly exported or shared

## Additional caveats
- authenticated operator, driver, and admin flows still depend on seeded staging accounts
- fallback and escalation paths are documented, but still require human operators to execute them well
- customer/operator tracking and support logs reduce ambiguity, but do not remove manual support dependence
- reconciliation follow-up remains partly manual
- design-system migration is ongoing and not every shell is equally mature

## What this means for demos and testers
Safe to say:
- the Stage 1 spine is real and staging-proven
- ordering, dispatch, driver execution, delivery completion, payment capture, and fulfilled order state are connected
- operators and admins have real visibility surfaces

Do not say:
- this is already ready for unattended public pilot traffic
- payouts are automated end-to-end
- live driver movement is shown on a map
- outbound email delivery is fully proven
- courier compliance operations are fully production-owned
