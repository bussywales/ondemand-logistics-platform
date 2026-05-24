# Pilot Launch Checklist

Use this checklist before any controlled pilot launch, investor walkthrough, merchant demo, or operator partner session. The goal is to prove the environment is current, the demo path is coherent, and known limitations are explicit before anyone presents ShipWright as pilot-ready.

## 1. Deployment and Schema

- [ ] `main` is pushed and staging web/API deployments are on the expected commit.
- [ ] Staging web route checks do not show stale Vercel 404s for current admin/business routes.
- [ ] All migrations are applied to staging.
- [ ] `pnpm release:verify-staging` passes direct schema readiness checks.
- [ ] Release-critical schemas include current operational surfaces: validation evidence, analytics, finance reviews, governance, support history, pilot workspaces, dispatch audit, and menu history.

## 2. Readiness Evidence

- [ ] Run the canonical rehearsal gate:

```bash
pnpm rehearsal:verify-staging
```

- [ ] Release verification passes.
- [ ] Paid-delivery proof passes.
- [ ] Required-auth Playwright smoke passes `7/7`.
- [ ] Stored validation evidence is recorded.
- [ ] `/admin/release-readiness` shows `READY`.
- [ ] `/admin/validation-evidence` shows fresh release, proof, and smoke evidence within the 24-hour readiness window.
- [ ] Latest proof order/job/payment/POD IDs are noted for the presenter.
- [ ] Generated proof JSON artifacts remain local and uncommitted unless explicitly exported.

## 3. Proof Assets and Public Story

- [ ] Public site routes load: `/`, `/pricing`, `/demo/request`, `/demo`, `/demo/investor`.
- [ ] Reviewed proof screenshots exist in `apps/web/public/proof/`.
- [ ] Landing page proof visuals render without broken images or layout overflow.
- [ ] Proof assets use staging-safe/generic data only.
- [ ] No real customer logos, fake metrics, secrets, provider IDs, or personal data appear in public visuals.
- [ ] Pricing copy remains controlled-pilot packaging, not invented public SaaS pricing.

## 4. Demo Request and Commercial Intake

- [ ] `/demo/request` submits successfully on staging.
- [ ] Submitted request appears in `/admin/demo-requests`.
- [ ] Admin can update status, owner, priority, note, and next follow-up date if needed.
- [ ] `/admin/command` reflects commercial intake posture.
- [ ] `/admin/analytics` loads and shows current first-party funnel state.
- [ ] Notification diagnostics are reviewed at `/admin/notifications`.
- [ ] Notification env status is known: configured, skipped/unconfigured, or failed with a safe explanation.
- [ ] No CRM sync or email delivery is claimed unless the relevant env and worker delivery path are verified.

## 5. Pilot Merchant Data

- [ ] Pilot merchant workspace is prepared.
- [ ] Restaurant profile is present and staging-safe.
- [ ] Menu sections/items are ordered, visible, and priced correctly.
- [ ] Public restaurant route loads menu items after staging warmup.
- [ ] Menu history and rollback readiness are visible for recent edits.
- [ ] No real customer addresses, phone numbers, or private merchant data are used in the walkthrough.

## 6. Accounts and Access

- [ ] Admin smoke account signs in and can access `/admin`.
- [ ] Business/operator smoke account signs in and can access `/app`.
- [ ] Driver smoke account signs in and can access `/driver`.
- [ ] Fleet-manager smoke account signs in and can access `/fleet`.
- [ ] Ordinary driver remains denied from fleet-manager workspace controls.
- [ ] `/admin/users`, `/admin/orgs`, and `/app/settings/team` show expected IAM/invite posture.
- [ ] `/admin/governance` loads for platform admins.

## 7. Operational Walkthrough Routes

- [ ] `/admin/command` loads and shows command posture.
- [ ] `/admin/pilots` and a pilot rehearsal cockpit load.
- [ ] `/app/restaurant` loads and supports menu management demonstration.
- [ ] Public restaurant ordering route loads.
- [ ] `/app/jobs` and at least one job detail route load.
- [ ] `/app/finance` loads finance review posture.
- [ ] `/admin/finance` loads cross-org finance posture.
- [ ] `/admin/dispatch-audit` loads dispatch governance history.
- [ ] `/admin/operational-resets` loads non-destructive reset controls.

## 8. Known Limitations Review

- [ ] Presenters review `docs/known-limitations.md`.
- [ ] No autonomous refund claim is made.
- [ ] No payout automation claim is made.
- [ ] No CRM sync claim is made.
- [ ] No autonomous dispatch decision claim is made.
- [ ] No live impersonation claim is made.
- [ ] No SSO/SCIM claim is made.
- [ ] Tracking is described as status/progress visibility, not guaranteed live-map movement.
- [ ] Human-reviewed workflows are framed as an intentional pilot safety model.

## Launch Decision

Use this decision rule:

- `GO`: rehearsal verification passes, `/admin/release-readiness` is `READY`, smoke is `7/7`, accounts are verified, proof screenshots are reviewed, and limitations are understood.
- `GO WITH NOTE`: readiness is technically valid but there is a known demo caveat, such as low analytics data or notification env intentionally unconfigured.
- `NO GO`: readiness evidence is missing/stale/failed, routes are unavailable, migrations are missing, auth smoke fails, or presenters cannot explain current limitations.
