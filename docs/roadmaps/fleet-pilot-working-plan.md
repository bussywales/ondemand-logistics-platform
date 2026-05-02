# Fleet Pilot MVP Working Plan

## Purpose
This is the Stage 1 execution document for Fleet / ShipWright.

Use it to:
- prioritise weekly work
- prevent Stage 2 and Stage 3 scope from leaking into pilot
- track what is active, blocked, manual, or deferred
- keep staging proof and demo claims tied to actual repo evidence

This document must stay aligned with:
- `/Users/olubusayoadewale/Coding Projects/shipwright/docs/roadmaps/fleet-roadmap.md`
- `/Users/olubusayoadewale/Coding Projects/shipwright/docs/roadmaps/fleet-scope-cut-matrix.md`
- `/Users/olubusayoadewale/Coding Projects/shipwright/docs/roadmaps/fleet-pilot-readiness-checklist.md`

## Stage objective
Complete real staged deliveries end-to-end in a tightly controlled launch area.

Stage 1 exists to prove the operating model. It does not exist to finish the full platform.

## Current planning assumptions
- pilot geography is constrained
- pilot restaurant count is small
- courier pool is small and managed
- some workflows remain manual during pilot
- reliability matters more than broad feature depth
- merchant activation is sales-led
- investor demos require repeatable staging proof, not fake success states

## Current evidence
Current Stage 1 evidence is now stronger than the original plan baseline.

Live/staging repo evidence includes:
- public restaurant ordering route
- Stripe-backed paid checkout authorization
- business orders surface
- dispatch/job creation from paid orders
- driver offer and execution route
- proof of delivery and delivered state
- payment capture after delivery
- terminal customer order state as `FULFILLED`
- admin control plane
- persistent in-app business notifications
- help centre and product updates surfaces
- staging release verification and proof archive

Reference evidence:
- `/Users/olubusayoadewale/Coding Projects/shipwright/docs/staging-paid-delivery-proof.md`
- `/Users/olubusayoadewale/Coding Projects/shipwright/docs/release-checklist.md`
- `/Users/olubusayoadewale/Coding Projects/shipwright/docs/proofs/`

## Workstreams

### 1) Restaurant onboarding and menu setup
- Objective: get at least one pilot restaurant operational
- Key deliverables:
  - onboarding workflow
  - menu setup path
  - merchant owner for changes and launch readiness
- Current status: In progress
- Dependencies:
  - pilot restaurant commitment
  - pilot commercial terms
  - menu data source
- Notes / risks:
  - one pilot restaurant path exists in staging
  - broader merchant activation polish and scale are not complete

### 2) Branded customer ordering flow
- Objective: provide a usable customer-facing order surface
- Key deliverables:
  - branded ordering page
  - menu browsing and item selection
  - order submission into the real order path
- Current status: In progress
- Dependencies:
  - restaurant onboarding and menu setup
  - checkout and payment
- Notes / risks:
  - the baseline flow is real and staging-proven
  - design-system migration and route polish are still ongoing

### 3) Checkout and payment
- Objective: make pilot transactions reliable enough to take real orders
- Key deliverables:
  - checkout flow on live payment rails
  - payment authorization path
  - payment state visibility for operators
- Current status: In progress
- Dependencies:
  - branded ordering flow
  - existing payment foundation in API and web
- Notes / risks:
  - Stripe authorization, capture, and fulfilled order state are proven in staging
  - payout and reconciliation visibility remain unfinished
  - Resend external email delivery is still parked pending verified sender/domain setup

### 4) Courier onboarding compliance
- Objective: reach the minimum credible courier activation standard
- Key deliverables:
  - driver onboarding path
  - minimum identity and compliance checks
  - approval owner and exception owner
- Current status: In progress
- Dependencies:
  - compliance decisions
  - seeded pilot courier pool
- Notes / risks:
  - staged driver fixtures and approved verification state exist
  - live pilot compliance ownership and fallback handling remain incomplete

### 5) Courier offer, accept, and delivery flow
- Objective: let a courier receive work and complete delivery end-to-end
- Key deliverables:
  - offer and accept flow
  - pickup and delivery status progression
  - delivery completion against the pilot proof standard
- Current status: In progress
- Dependencies:
  - courier onboarding compliance
  - dispatch and order-state operations
  - real job creation path
- Notes / risks:
  - staged proof harness completes offer -> accept -> POD -> delivered
  - live pilot validation outside the harness still matters

### 6) Dispatch and order-state operations
- Objective: operate live order state safely enough for pilot
- Key deliverables:
  - order creation to dispatch path
  - dispatch visibility
  - manual dispatch fallback understanding
- Current status: In progress
- Dependencies:
  - reliable order creation
  - courier offer flow
  - release reliability discipline
- Notes / risks:
  - order creation, dispatch, retry, reassign, and cancel are now hardened
  - manual fallback playbooks remain incomplete
  - customer and operator tracking v1 remains incomplete

### 7) Basic customer and restaurant visibility
- Objective: provide enough visibility to run the pilot without constant manual clarification
- Key deliverables:
  - basic restaurant order visibility
  - basic customer order status visibility
  - clear status model for support use
- Current status: In progress
- Dependencies:
  - order-state operations
  - ordering flow
  - delivery completion flow
- Notes / risks:
  - business orders and notifications exist
  - customer/operator tracking v1 is still outstanding
  - notification visibility for new paid orders is working at API level and should remain part of regression checks

### 8) Pilot operations and manual fallback processes
- Objective: ensure the pilot can still run when software does not automate a step
- Key deliverables:
  - manual dispatch fallback
  - support and escalation path
  - owner for failed, delayed, or disputed orders
  - basic payout and reconciliation operating process
- Current status: At risk
- Dependencies:
  - operational ownership
  - visibility into order and payment state
- Notes / risks:
  - this is still behind the product and staging proof work
  - payout/reconciliation visibility and fallback playbooks are the clearest remaining Stage 1 ops gap

### 9) Release reliability and platform hardening
- Objective: keep staging and release verification credible enough for pilot risk
- Key deliverables:
  - release verification sequence
  - readiness checks for critical schema compatibility
  - authenticated smoke checks for critical paths
  - documented auth-restore and operational failure paths
- Current status: In progress
- Dependencies:
  - staging access
  - seeded verification accounts
  - disciplined release process
- Notes / risks:
  - readiness and release verification are green for the current staging baseline
  - this remains an ongoing control discipline, not a one-time finished task

## Priority order for execution
1. Finish the pilot merchant/menu/ordering surface polish
2. Keep checkout/payment and fulfilled-order proof stable
3. Keep courier execution proof stable while clarifying real pilot compliance ownership
4. Close customer/operator tracking v1 gaps
5. Write fallback, escalation, and reconciliation playbooks
6. Continue release reliability discipline without letting it replace product work

## Explicitly manual for Pilot MVP
These can remain manual in Stage 1 if ownership is explicit:
- merchant onboarding review and activation
- menu loading and correction
- support handling for failed, delayed, or disputed orders
- some payout and reconciliation workflows
- some exception handling and recovery steps
- parts of courier approval review
- investor/demo reset and rehearsal process

## Explicitly out of scope for Pilot MVP
Do not pull these into Stage 1 unless they directly unblock pilot:
- subscription billing automation
- advanced analytics and reporting
- referral tooling
- rich courier earnings tooling
- broad self-serve onboarding
- retention and optimisation features
- scale-grade operational efficiency tooling
- Stage 2 dispatch automation beyond pilot necessity

## Blockers / open questions
- customer and operator tracking v1 is still not complete
- fallback dispatch/support/escalation playbooks are still not complete
- payout and reconciliation visibility is still not complete
- live pilot compliance ownership is still thinner than the staged proof baseline
- Resend email delivery remains intentionally parked until a verified sender/domain exists
- design-system migration and shell decomposition remain in progress

## Pilot MVP exit criteria
Pilot MVP is ready only when all of the following are true:
- at least one pilot restaurant can be onboarded and activated repeatably
- the menu is loaded and orderable
- the branded ordering page creates real pilot orders
- the payment path works reliably enough for pilot checkout
- an order can be created, dispatched, accepted, picked up, and completed in controlled conditions
- customer orders settle to `FULFILLED` after delivered and captured payment state
- couriers can receive and complete jobs under the defined pilot compliance standard
- restaurant and customer visibility are sufficient for routine pilot operation
- operators can handle failures and exceptions without improvising the whole process
- staging release verification and authenticated smoke discipline are strong enough for pilot risk

## Progress tracking
Use these statuses only:
- Not started
- In progress
- At risk
- Complete
- Deferred

| Workstream | Status | Next checkpoint |
| --- | --- | --- |
| Restaurant onboarding and menu setup | In progress | tighten pilot merchant setup and menu editing path |
| Branded customer ordering flow | In progress | finish premium surface migration and recheck live browser flow |
| Checkout and payment | In progress | keep auth/capture/fulfilled path stable and improve payout visibility |
| Courier onboarding compliance | In progress | define pilot compliance ownership beyond staged fixtures |
| Courier offer, accept, and delivery flow | In progress | repeat staged proof and maintain driver execution quality |
| Dispatch and order-state operations | In progress | finish tracking visibility and fallback handling |
| Basic customer and restaurant visibility | In progress | close tracking v1 and keep order notifications verified |
| Pilot operations and manual fallback processes | At risk | write fallback, escalation, and reconciliation playbooks |
| Release reliability and platform hardening | In progress | keep `/readyz`, schema verification, and proof archive current |

## Change control
- this working plan must stay aligned with the roadmap package
- new work does not enter Stage 1 unless it supports pilot success directly
- if stakeholder direction changes, update the roadmap docs first or in tandem
- do not silently insert Stage 2 or Stage 3 work into the Pilot MVP queue
