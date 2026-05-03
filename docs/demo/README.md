# Demo And Tester Guides

Use these documents when running controlled ShipWright demos or tightly managed staging tester sessions.

## Demo runbooks
- `controlled-demo-runbook.md`
- `demo-script.md`
- `known-limitations.md`
- `tester-session-checklist.md`
- `investor-demo-script.md`

## Recommended order
1. Run `pnpm release:verify-staging`
2. Run `pnpm proof:staging-paid-delivery`
3. Review the latest artifacts in `docs/proofs/`
4. Use `controlled-demo-runbook.md` for session setup
5. Use `demo-script.md` during the walkthrough
6. Use `tester-session-checklist.md` before, during, and after internal tester sessions
7. Use `known-limitations.md` to keep claims disciplined
