# ShipWright Known Limitations

Date: 2026-05-24

ShipWright v1 is prepared for controlled pilot demonstrations, managed rehearsals, and tightly supervised early operations. It is not yet an unattended public marketplace or fully automated logistics/finance platform.

## Automation boundaries
- No automated refunds.
- No payout or settlement automation.
- No autonomous dispatch decisions, driver reassignment, driver scoring, or driver suspension.
- No automated customer, merchant, courier, or sales follow-up messaging from support, finance, or demo request workflows.
- No live impersonation or support-session switching.
- Menu rollback is human-reviewed and requires preview plus typed confirmation.
- Operational reset tools are non-destructive and do not mutate proof orders, jobs, payments, or audit evidence.

## Commercial and integration limitations
- No CRM sync.
- Notification delivery requires environment configuration: `DEMO_REQUEST_WEBHOOK_URL`, `ADMIN_NOTIFICATION_EMAIL`, `RESEND_API_KEY`, and `NOTIFICATION_FROM_EMAIL` where applicable.
- Missing notification configuration is an acceptable skipped/unconfigured state unless the demo explicitly proves outbound delivery.
- Public pricing is fit-review based; there are no invented self-serve prices.
- Public site does not use real customer logos or fabricated production metrics.

## Identity and enterprise limitations
- No SSO/SCIM.
- No destructive account deletion.
- Impersonation preview explains required controls but does not create an impersonation session.
- Suspended organisation enforcement is strongest where central guards exist; any endpoint-specific enforcement gaps should be treated as follow-up hardening before live expansion.

## Operations and product limitations
- Tracking is status/progress based, not a live courier map.
- Finance v1.1 records review ownership, status, and resolution context; it does not mutate Stripe, payouts, orders, jobs, or payments.
- Support escalation records are human-entered audit context; they do not send messages or trigger refunds/cancellations.
- Fleet readiness is visibility and compliance context; it does not change dispatch preference, payout, billing, or driver eligibility automatically.
- Release readiness reads stored validation evidence. It does not execute validation commands from the UI.

## Validation and deployment limitations
- Proof artifacts remain local and uncommitted unless intentionally exported.
- Stored validation evidence contains summary/status/IDs, not full proof artifacts or secrets.
- Staging deploy may require Vercel redeploy if Git integration stalls or a deployment remains pinned to an older commit.
- Seeded staging accounts and smoke credentials are required for full authenticated smoke coverage.
- A `READY` release-readiness verdict is freshness-based; rerun `pnpm rehearsal:verify-staging` before controlled demos and releases.

## Safe demo language
Safe to say:
- ShipWright is evidence-backed and ready for controlled pilot demonstrations.
- The core order, dispatch, proof, support, finance, fleet, and admin governance loops are visible and auditable.
- Human review is explicit for high-risk decisions.

Do not say:
- ShipWright is fully autonomous.
- Refunds, payouts, dispatch recovery, customer messaging, or support access are automated end-to-end.
- The public site reflects production customer metrics or logos.
- A controlled demo equals unattended live rollout readiness.
