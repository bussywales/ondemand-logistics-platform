# Demo And Tester Guides

Use these documents when running controlled ShipWright demos or tightly managed staging tester sessions.

## Demo runbooks
- `controlled-demo-runbook.md`
- `demo-script.md`
- `investor-walkthrough.md`
- `pilot-merchant-walkthrough.md`
- `demo-reset-checklist.md`
- `demo-known-limitations-talk-track.md`
- `known-limitations.md`
- `tester-session-checklist.md`
- `investor-demo-script.md`

## Demo readiness standard
Before any investor, pilot merchant, or internal tester demo:

1. Run `pnpm release:verify-staging`
2. Run `pnpm proof:staging-paid-delivery`
3. Run `pnpm --filter @shipwright/web test:smoke`
4. Record the latest order, job, payment, and POD ids from the proof output
5. Confirm the core staging routes needed for the audience
6. Review `demo-known-limitations-talk-track.md`

## Recommended order
1. Run `pnpm release:verify-staging`
2. Run `pnpm proof:staging-paid-delivery`
3. Run `pnpm --filter @shipwright/web test:smoke`
4. Review the latest artifacts in `docs/proofs/`
5. Use `demo-reset-checklist.md` to prepare the browser, accounts, ids, and fallback path
6. Use `controlled-demo-runbook.md` for session setup
7. Use `investor-walkthrough.md`, `pilot-merchant-walkthrough.md`, or `demo-script.md` during the walkthrough
8. Use `tester-session-checklist.md` before, during, and after internal tester sessions
9. Use `demo-known-limitations-talk-track.md` and `known-limitations.md` to keep claims disciplined
