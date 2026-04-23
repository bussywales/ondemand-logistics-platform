# Fleet Pilot MVP Working Plan

## Purpose
This document is the execution layer for Stage 1 of the Fleet roadmap.

It translates the roadmap into immediate working priorities, current active workstreams, and the minimum conditions for calling Pilot MVP ready. It must stay aligned with the roadmap package:
- `/Users/olubusayoadewale/Coding Projects/shipwright/docs/roadmaps/fleet-roadmap.md`
- `/Users/olubusayoadewale/Coding Projects/shipwright/docs/roadmaps/fleet-scope-cut-matrix.md`
- `/Users/olubusayoadewale/Coding Projects/shipwright/docs/roadmaps/fleet-pilot-readiness-checklist.md`

This is not a strategy replacement. It is the weekly execution reference for Stage 1.

## Stage objective
Complete real deliveries end-to-end in a tightly controlled launch area.

The Pilot MVP standard is:
- prove the operating model with real orders
- keep the scope narrow enough to reach live pilot quickly
- avoid importing Stage 2 and Stage 3 work unless it directly reduces pilot risk

## Current planning assumptions
- the pilot geography is controlled and explicitly limited
- the pilot restaurant count is small and curated
- the courier pool is small and operationally managed rather than open-ended
- some workflows remain manual during pilot if that reduces delivery risk
- delivery reliability matters more than surface polish
- merchant activation remains sales-led in Stage 1
- internal tooling can remain rough if operators can still run the pilot safely

## Workstreams

### 1) Restaurant onboarding and menu setup
**Objective**
Get at least one pilot restaurant operational with a usable catalogue and clear launch ownership.

**Key deliverables**
- pilot restaurant onboarding workflow
- menu setup process and data model usage path
- clear owner for merchant activation and content changes

**Current status**
- Not started

**Dependencies**
- pilot merchant commitment
- commercial terms for pilot
- menu data source and update process

**Notes / risks**
- this remains sales-led and operationally managed for Stage 1
- lack of merchant setup blocks every downstream pilot outcome

### 2) Branded customer ordering flow
**Objective**
Provide a customer-facing order surface that is credible enough for live pilot orders.

**Key deliverables**
- branded ordering page
- menu browsing and item selection flow
- order submission path aligned to real order creation

**Current status**
- Not started

**Dependencies**
- restaurant onboarding and menu setup
- checkout and payment integration
- basic customer status visibility

**Notes / risks**
- this must be usable, not fully polished
- design expansion beyond the core ordering path is not justified in Stage 1

### 3) Checkout and payment
**Objective**
Make the payment path reliable enough for real pilot transactions.

**Key deliverables**
- checkout flow connected to live payment infrastructure
- payment authorization and status visibility
- operator understanding of payment and payout handling during pilot

**Current status**
- In progress

**Dependencies**
- branded ordering flow
- existing payment foundation in the API and web app
- operator readiness for manual exception handling where needed

**Notes / risks**
- payment rails are bought and integrated, not reinvented
- payout and reconciliation can remain partially manual in pilot, but payment failures cannot be opaque

### 4) Courier onboarding compliance
**Objective**
Reach the minimum credible courier activation standard for a controlled pilot.

**Key deliverables**
- minimum driver onboarding path
- identity and compliance checks defined and applied
- clear approval and exception ownership

**Current status**
- In progress

**Dependencies**
- compliance and operating policy decisions
- small seeded courier pool for pilot geography

**Notes / risks**
- the current platform supports driver-side operational flows, but pilot compliance packaging should be treated as unfinished until explicitly documented and tested
- this is a pilot gate, not a later optimisation item

### 5) Courier offer, accept, and delivery flow
**Objective**
Ensure a courier can reliably receive work, accept it, collect the order, and complete delivery.

**Key deliverables**
- offer and accept flow working end-to-end
- pickup and delivery status progression
- delivery completion with the required pilot proof standard

**Current status**
- In progress

**Dependencies**
- courier onboarding compliance
- dispatch and order-state operations
- checkout and order creation path generating real jobs

**Notes / risks**
- the current repo already contains dispatch, job lifecycle, and proof-of-delivery foundations
- this flow should be validated in controlled live conditions, not assumed complete from backend coverage alone

### 6) Dispatch and order-state operations
**Objective**
Operate the live delivery state model safely enough for pilot execution.

**Key deliverables**
- order creation to dispatch path
- dispatch visibility and state transitions
- operator understanding of manual fallback when dispatch fails

**Current status**
- In progress

**Dependencies**
- reliable order creation
- courier offer flow
- release reliability and staging verification discipline

**Notes / risks**
- the current platform has meaningful dispatch foundations and recent release hardening work
- operator dispatch mutations remain the most likely next hardening candidate
- do not widen into Stage 2 dispatch automation in this plan

### 7) Basic customer and restaurant visibility
**Objective**
Provide enough status visibility for customers and merchants to complete pilot orders without constant manual clarification.

**Key deliverables**
- basic restaurant order visibility
- basic customer order status visibility
- clear status model for support and operational follow-up

**Current status**
- In progress

**Dependencies**
- order-state operations
- branded ordering flow
- delivery completion flow

**Notes / risks**
- current tracking and business visibility foundations exist, but the pilot-facing restaurant and customer experience is not yet complete
- this is a sufficiency problem, not a polish problem

### 8) Pilot operations and manual fallback processes
**Objective**
Ensure the pilot can still run when the software does not fully automate a workflow.

**Key deliverables**
- manual dispatch fallback procedure
- support and escalation path
- defined owner for failed, delayed, or disputed pilot orders
- basic payout and reconciliation operating process

**Current status**
- Not started

**Dependencies**
- compliance and commercial ownership
- visibility into order state and payment state

**Notes / risks**
- this work is easy to ignore and expensive to rediscover during live operations
- manual processes are acceptable in Stage 1 only if they are explicit and owned

### 9) Release reliability and platform hardening
**Objective**
Keep staging and release verification credible enough that pilot traffic is not riding on guesswork.

**Key deliverables**
- staging release verification sequence
- readiness checks for critical schema compatibility
- authenticated smoke checks for release-critical flows
- documented auth-restore and operational failure paths

**Current status**
- In progress

**Dependencies**
- staging environment access
- seeded business and driver verification accounts
- disciplined release process

**Notes / risks**
- this work is already active in the repo and should remain narrow and practical
- current likely next hardening candidate remains operator dispatch mutations and adjacent offer-state transitions

## Priority order for execution
1. Restaurant onboarding and menu setup
2. Branded customer ordering flow
3. Checkout and payment
4. Courier onboarding compliance
5. Courier offer, accept, and delivery flow
6. Dispatch and order-state operations
7. Basic customer and restaurant visibility
8. Pilot operations and manual fallback processes
9. Release reliability and platform hardening

This order is deliberate. Pilot does not begin with analytics, tooling polish, or optimisation. It begins with merchant activation, orderability, payment, and the ability to complete deliveries reliably.

## Explicitly manual for Pilot MVP
The following can remain manual or simplified in Stage 1, provided ownership is clear:
- merchant onboarding review and activation
- menu content loading and correction
- support handling for failed, delayed, or disputed orders
- some payout and reconciliation workflows
- some exception handling and operational recovery steps
- internal admin workflow polish
- parts of courier approval review where a minimum compliance standard is still met

Manual is acceptable only where the workflow is documented, owned, and does not create uncontrolled pilot risk.

## Explicitly out of scope for Pilot MVP
The following should not be pulled into Stage 1 unless they directly unblock pilot:
- subscription billing automation
- advanced analytics and reporting
- referral tooling
- rich courier earnings tooling
- polished admin tooling beyond pilot necessity
- broad self-serve onboarding
- retention and optimisation features
- scale-grade operational efficiency tooling
- Stage 2 dispatch automation expansion beyond what is needed for controlled pilot success

## Blockers / open questions
- pilot restaurants are not yet clearly represented as onboarded live pilot accounts in the current repo state
- restaurant menu and ordering experience are roadmap-defined but not yet clearly complete product surfaces
- courier compliance packaging and policy ownership still need explicit operational definition
- payout and reconciliation readiness for pilot remain partially manual and need named ownership
- support and escalation ownership for live pilot incidents should be made explicit before launch
- controlled pilot geography, service window, and launch merchants need to be locked commercially rather than assumed

## Pilot MVP exit criteria
Pilot MVP is ready only when the following are true:
- at least one pilot restaurant can be onboarded and activated
- the menu is loaded and orderable
- the branded ordering page can create real pilot orders
- the payment path works reliably enough for pilot checkout
- an order can be created, dispatched, accepted, picked up, and completed in controlled conditions
- couriers can receive and complete jobs under the defined pilot compliance standard
- restaurant and customer visibility are sufficient for routine pilot operation
- operators can handle failures and exceptions without improvising the entire process
- staging release verification, readiness checks, and authenticated smoke discipline are strong enough for pilot risk
- the team can complete live pilot orders without constant manual intervention on every order

## Progress tracking
Use these statuses only:
- Not started
- In progress
- At risk
- Complete
- Deferred

| Workstream | Status | Owner | Next checkpoint |
| --- | --- | --- | --- |
| Restaurant onboarding and menu setup | Not started | Unassigned | define pilot merchant setup path |
| Branded customer ordering flow | Not started | Unassigned | define minimum orderable customer surface |
| Checkout and payment | In progress | Unassigned | verify live checkout path against pilot order flow |
| Courier onboarding compliance | In progress | Unassigned | define pilot compliance minimum and approval process |
| Courier offer, accept, and delivery flow | In progress | Unassigned | validate live end-to-end courier completion path |
| Dispatch and order-state operations | In progress | Unassigned | harden operator dispatch mutation path |
| Basic customer and restaurant visibility | In progress | Unassigned | define minimum pilot visibility standard by actor |
| Pilot operations and manual fallback processes | Not started | Unassigned | write pilot fallback and escalation playbooks |
| Release reliability and platform hardening | In progress | Unassigned | maintain staging verification discipline and next hardening pass |

## Change control
This working plan must remain aligned with the roadmap package.

New work should not enter Stage 1 unless it supports pilot success directly.

If stakeholder direction changes:
1. update the roadmap docs first or in tandem
2. then update this working plan to reflect the changed Stage 1 execution boundary
3. do not silently insert Stage 2 or Stage 3 work into the Pilot MVP queue
