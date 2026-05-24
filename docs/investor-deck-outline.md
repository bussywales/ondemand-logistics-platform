# Investor Deck Outline

This is a concise structure for turning ShipWright's controlled-pilot-ready product into an investor conversation. Keep claims grounded in the current product: evidence-backed, human-reviewed, operationally mature, and ready for controlled pilots.

## 1. Problem

Local commerce fulfilment is fragmented. Restaurants, retailers, operators, couriers, support teams, and finance reviewers often work across disconnected tools with poor visibility into what happened, who acted, and what still needs review.

Key points:
- Local delivery operations break at the seams between order, dispatch, courier execution, support, payment state, and closeout.
- Operators need accountability and recovery workflows, not another thin delivery dashboard.
- Early pilots fail when readiness, proof, and exceptions are handled manually outside the product.

## 2. Why Now

Local merchants and operators need controlled, auditable delivery infrastructure without committing immediately to a full marketplace or enterprise TMS.

Key points:
- Commerce expectations have moved faster than small-operator tooling.
- Payment, support, dispatch, and fleet workflows can now be orchestrated in a lighter controlled-pilot layer.
- AI-assisted operations are useful only when the underlying workflow and audit trail are reliable.

## 3. Product

ShipWright is a controlled-pilot operations platform for local commerce fulfilment.

Show:
- Public ordering and pricing/pilot package pages.
- Merchant menu operations with audit and rollback.
- Business workspace for orders, jobs, finance, and support.
- Admin command centre for cross-org posture.
- Fleet workspace for driver-company readiness.

Positioning:
- Operating spine for local commerce in motion.
- Human-reviewed command layer, not autonomous fulfilment.
- Pilot-ready foundation for merchants, operators, fleets, and platform teams.

## 4. Operational Workflow

Use the workflow narrative:

1. Commerce enters the network through public ordering or demo request intake.
2. Merchant setup and menu operations make the offer operationally real.
3. Jobs and dispatch coordinate movement.
4. Couriers/fleets execute with readiness visibility.
5. Exceptions are logged through support and dispatch governance.
6. Finance review tracks payment/refund posture without provider mutation.
7. Proof, validation evidence, and release readiness close the loop.

## 5. Proof and Readiness

This section is the credibility anchor.

Proof points:
- `/admin/release-readiness` provides a `READY` / `NEEDS_REVIEW` / `BLOCKED` verdict.
- `/admin/validation-evidence` stores release verification, paid-delivery proof, and required-auth smoke evidence.
- `pnpm rehearsal:verify-staging` is the one-command rehearsal gate.
- Paid-delivery proof records order/job/payment/POD IDs.
- Playwright smoke validates authenticated admin, business, driver, and fleet routes.
- Proof screenshots are reviewed and staging-safe.

Do not claim production customer metrics or guaranteed delivery outcomes.

## 6. Market and Pilot Wedge

Start with controlled local commerce pilots where operational proof matters more than broad marketplace liquidity.

Pilot wedge:
- Restaurants and local retailers that need a managed delivery workflow.
- Dispatch operators coordinating multi-merchant fulfilment.
- Driver companies/fleets needing readiness and member visibility.
- Operator partners that want a platform command layer before deeper automation.

Expansion path:
- Controlled pilots.
- Operator partnerships.
- Finance/support governance.
- Fleet-managed courier pools.
- Later integrations for CRM, email, settlements, SSO/SCIM, and more automated workflows.

## 7. Business Model

Keep public pricing flexible and fit-reviewed.

Potential model:
- Controlled pilot setup fee based on scope and readiness support.
- Monthly platform fee for operators or merchant networks.
- Usage component based on order volume, support volume, or active workspaces.
- Optional premium modules for fleet management, finance governance, analytics, and enterprise access controls.

Current public copy should remain: pilot pricing discussed after fit review.

## 8. Differentiation

ShipWright is not positioned as a generic delivery app or a black-box AI dispatcher.

Differentiators:
- Evidence-backed release readiness.
- Human-reviewed support, dispatch, finance, reset, and governance workflows.
- Merchant menu operations with audit and rollback.
- Dispatch override governance and assignment audit.
- Fleet company workspace and readiness visibility.
- Persistent finance review without automated refund/payout risk.
- First-party analytics and commercial intake without external vendor dependency.
- Honest limitations and controlled-pilot discipline.

## 9. Roadmap

Near-term:
- Pilot launch execution and partner feedback.
- Commercial follow-up improvements.
- Notification delivery hardening when env is configured.
- Public proof asset polish and real pilot collateral.

Mid-term:
- CRM/webhook/email delivery integrations.
- Payment settlement/payout visibility improvements.
- Fleet operations depth.
- Role/access hardening and enterprise admin polish.

Later:
- SSO/SCIM.
- Audited live impersonation.
- Deeper automation with explicit human approval.
- Broader marketplace/network features if pilots validate demand.

## 10. Ask / Next Step

Choose the ask based on audience.

Investor ask:
- Review controlled pilot readiness and support the first set of real pilots.
- Fund product hardening, pilot operations, and commercial conversion.

Pilot merchant/operator ask:
- Select one controlled workflow to rehearse.
- Agree pilot scope, roles, support owner, limitations, and success criteria.
- Run the launch checklist before any customer-facing pilot activity.

Partner ask:
- Identify a managed operating environment where ShipWright can prove order-to-proof visibility.
- Define integration needs without promising CRM, payout, or autonomous dispatch in the first pass.
