# Fleet Pilot MVP Working Plan

## Purpose
This is the execution document for Stage 1.

Use it to:
- prioritise weekly work
- prevent Stage 2 and Stage 3 scope from leaking into pilot
- track what is active, blocked, manual, or deferred

This document must stay aligned with:
- `/Users/olubusayoadewale/Coding Projects/shipwright/docs/roadmaps/fleet-roadmap.md`
- `/Users/olubusayoadewale/Coding Projects/shipwright/docs/roadmaps/fleet-scope-cut-matrix.md`
- `/Users/olubusayoadewale/Coding Projects/shipwright/docs/roadmaps/fleet-pilot-readiness-checklist.md`

## Stage objective
Complete real deliveries end-to-end in a tightly controlled launch area.

Stage 1 exists to prove the operating model. It does not exist to finish the full platform.

## Current planning assumptions
- pilot geography is constrained
- pilot restaurant count is small
- courier pool is small and managed
- some workflows remain manual during pilot
- reliability matters more than polish
- merchant activation is sales-led
- internal tooling can stay rough if operators can still run the pilot safely

## Workstreams

### 1) Restaurant onboarding and menu setup
- Objective: get at least one pilot restaurant operational
- Key deliverables:
  - onboarding workflow
  - menu setup path
  - merchant owner for changes and launch readiness
- Current status: Not started
- Dependencies:
  - pilot restaurant commitment
  - pilot commercial terms
  - menu data source
- Notes / risks:
  - this blocks everything downstream

### 2) Branded customer ordering flow
- Objective: provide a usable customer-facing order surface
- Key deliverables:
  - branded ordering page
  - menu browsing and item selection
  - order submission into the real order path
- Current status: Not started
- Dependencies:
  - restaurant onboarding and menu setup
  - checkout and payment
- Notes / risks:
  - usability matters; polish does not

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
  - payout and reconciliation can remain partly manual
  - payment failures cannot remain opaque

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
  - pilot compliance is still an execution gap, not a solved item

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
  - backend foundations exist
  - live pilot validation still matters more than backend confidence alone

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
  - next likely hardening target remains operator dispatch mutations
  - do not pull Stage 2 dispatch automation into Stage 1

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
  - sufficiency is required
  - depth and polish are not

### 8) Pilot operations and manual fallback processes
- Objective: ensure the pilot can still run when software does not automate a step
- Key deliverables:
  - manual dispatch fallback
  - support and escalation path
  - owner for failed, delayed, or disputed orders
  - basic payout and reconciliation operating process
- Current status: Not started
- Dependencies:
  - operational ownership
  - visibility into order and payment state
- Notes / risks:
  - this is easy to ignore and expensive to rediscover live

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
  - keep this narrow and practical

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

## Explicitly manual for Pilot MVP
These can remain manual in Stage 1 if ownership is explicit:
- merchant onboarding review and activation
- menu loading and correction
- support handling for failed, delayed, or disputed orders
- some payout and reconciliation workflows
- some exception handling and recovery steps
- internal admin workflow polish
- parts of courier approval review

## Explicitly out of scope for Pilot MVP
Do not pull these into Stage 1 unless they directly unblock pilot:
- subscription billing automation
- advanced analytics and reporting
- referral tooling
- rich courier earnings tooling
- polished admin tooling beyond pilot necessity
- broad self-serve onboarding
- retention and optimisation features
- scale-grade operational efficiency tooling
- Stage 2 dispatch automation beyond pilot necessity

## Blockers / open questions
- pilot restaurants are not yet clearly represented as live onboarded pilot accounts in the repo state
- menu setup and ordering flow are still roadmap items more than finished pilot surfaces
- courier compliance packaging still needs explicit operating ownership
- payout and reconciliation readiness still needs named pilot ownership
- support and escalation ownership for live pilot incidents needs to be made explicit
- pilot geography, service window, and launch merchants still need commercial lock-in

## Pilot MVP exit criteria
Pilot MVP is ready only when all of the following are true:
- at least one pilot restaurant can be onboarded and activated
- the menu is loaded and orderable
- the branded ordering page creates real pilot orders
- the payment path works reliably enough for pilot checkout
- an order can be created, dispatched, accepted, picked up, and completed in controlled conditions
- couriers can receive and complete jobs under the defined pilot compliance standard
- restaurant and customer visibility are sufficient for routine pilot operation
- operators can handle failures and exceptions without improvising the whole process
- staging release verification and authenticated smoke discipline are strong enough for pilot risk
- the team can run the pilot without constant manual intervention on every order

## Progress tracking
Use these statuses only:
- Not started
- In progress
- At risk
- Complete
- Deferred

| Workstream | Status | Next checkpoint |
| --- | --- | --- |
| Restaurant onboarding and menu setup | Not started | define pilot merchant setup path |
| Branded customer ordering flow | Not started | define minimum orderable customer surface |
| Checkout and payment | In progress | verify live checkout path against pilot order flow |
| Courier onboarding compliance | In progress | define pilot compliance minimum and approval process |
| Courier offer, accept, and delivery flow | In progress | validate live end-to-end courier completion path |
| Dispatch and order-state operations | In progress | harden operator dispatch mutation path |
| Basic customer and restaurant visibility | In progress | define minimum pilot visibility standard by actor |
| Pilot operations and manual fallback processes | Not started | write fallback and escalation playbooks |
| Release reliability and platform hardening | In progress | maintain staging verification discipline and next hardening pass |

## Change control
- this working plan must stay aligned with the roadmap package
- new work does not enter Stage 1 unless it supports pilot success directly
- if stakeholder direction changes, update the roadmap docs first or in tandem
- do not silently insert Stage 2 or Stage 3 work into the Pilot MVP queue
