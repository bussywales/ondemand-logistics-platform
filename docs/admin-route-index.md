# Admin Route Index

Date: 2026-05-24

This index lists the primary platform-admin routes for controlled pilot operation. Risk level reflects operational impact, not security permission strength; all routes remain platform-admin guarded unless explicitly documented otherwise.

| Route | Purpose | Read/write status | Risk level | Related docs |
| --- | --- | --- | --- | --- |
| `/admin` | Admin home, operational summary, route entry points. | Mostly read-only navigation and summary. | Low | `docs/operator-guide.md` |
| `/admin/command` | Cross-org command posture for support, finance, dispatch, pilot, demo request, and notification signals. | Read-only. | Low | `docs/demo/demo-script.md` |
| `/admin/users` | Dense user directory, memberships, governance status, suspension/reactivation, impersonation preview. | Human-reviewed writes for user status; no deletion or live impersonation. | High | `docs/operator-guide.md`, `docs/known-limitations.md` |
| `/admin/orgs` | Organisation directory, org status, membership access. | Human-reviewed writes for org status and membership controls. | High | `docs/operator-guide.md` |
| `/admin/governance` | Suspended org/user posture and governance event review. | Human-reviewed status controls where available. | High | `docs/known-limitations.md` |
| `/admin/pilots` | Pilot workspaces, mode/status/readiness, owners, and checklists. | Admin-managed pilot profile/checklist writes. | Medium | `docs/demo/controlled-demo-runbook.md` |
| `/admin/validation-evidence` | Stored release verification, paid proof, and smoke evidence. | Read-only. | Low | `docs/release-notes/v1-controlled-pilot.md` |
| `/admin/release-readiness` | Single `READY` / `NEEDS_REVIEW` / `BLOCKED` verdict from stored validation evidence. | Read-only. | Low | `docs/release-checklist.md` |
| `/admin/notifications` | Notification configuration diagnostics, recent status, test notification event creation. | Creates marked test events only; no secret editing. | Medium | `docs/release-checklist.md` |
| `/admin/analytics` | First-party public funnel analytics and recent event summary. | Read-only. | Low | `README.md` |
| `/admin/demo-requests` | Demo request review, owner, priority, follow-up state, notes, and history. | Human-reviewed lead workflow writes. | Medium | `docs/demo/controlled-demo-runbook.md` |
| `/admin/finance` | Cross-org finance summary, transactions, refund candidates, and finance review visibility. | Read-only in admin posture. | Medium | `docs/operator-guide.md` |
| `/admin/dispatch-audit` | Cross-org manual dispatch/assignment audit. | Read-only. | Medium | `docs/demo/demo-script.md` |
| `/admin/menu-history` | Cross-org menu change history and rollback-readiness labels. | Read-only; rollback remains business-scoped. | Medium | `docs/operator-guide.md` |
| `/admin/operational-resets` | Non-destructive staging/demo reset preview, per-record selection, and execution. | Human-reviewed writes with typed confirmation. | High | `docs/demo/demo-reset-checklist.md` |
| `/admin/fleets` | Driver-company organisations, fleet membership, driver readiness summary. | Admin-managed fleet org/member writes. | Medium | `docs/operator-guide.md` |

## Read/write rules
- High-risk admin routes must keep typed confirmation, reason capture, and audit trail where they mutate access, reset state, or governance status.
- Finance, menu history, dispatch audit, validation evidence, and release readiness are investigation/readiness surfaces, not mutation shortcuts.
- Proof orders, jobs, payments, audit logs, support histories, validation evidence, and reset histories must not be hard-deleted from admin workflows.
