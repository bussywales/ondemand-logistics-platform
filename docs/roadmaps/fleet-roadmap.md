# Fleet Roadmap

## Purpose
This roadmap is the operating reference for Fleet delivery planning.

It exists to keep commercial intent, product scope, engineering sequencing, and operational readiness aligned. It should be used to:
- decide what is in the next delivery stage
- decide what is explicitly out of scope or manual for now
- track progress without rewriting the plan every time priorities move
- record course-corrections in a durable way

This document is the primary roadmap source of truth. It should be updated as delivery evolves, not replaced casually.

## Delivery principle
Preserve the full Fleet vision, but stage delivery ruthlessly to reduce time-to-pilot, execution risk, and founder dependence.

The standard for each stage is not completeness. The standard is whether that stage creates the next credible operating position.

## Stage 1 — Pilot MVP
### Goal
Complete real deliveries end-to-end in a tightly controlled launch area.

### In scope
- restaurant onboarding
- menu setup
- branded ordering page
- checkout and payment
- order creation
- courier offer and accept flow
- pickup and delivery completion
- basic customer order visibility and status
- basic restaurant order visibility
- minimum courier onboarding compliance

### Explicitly not required for pilot
- subscription billing automation
- advanced analytics and reporting
- referral tooling
- rich courier earnings tooling
- polished admin tooling
- fully scaled support and dispute workflows
- fully automated payout and reconciliation workflows

### Expected outcomes
- at least one pilot merchant can trade live orders through the platform
- a courier can be offered work, accept it, and complete delivery
- the customer, restaurant, and operator can all see enough status to complete support and exception handling
- the business can prove the operating model before investing in scale-stage automation

### Success metrics
- first successful live order completed end-to-end
- pilot completion rate is commercially acceptable for a controlled launch
- dispatch acceptance time is acceptable for pilot service levels
- pilot merchants are willing to continue after the initial trial period
- the team can operate the launch without constant founder intervention on every order

## Stage 2 — Operational Launch
### Goal
Make the system operationally credible and materially less founder-dependent.

### In scope
- stronger dispatch automation
- improved tracking
- proof of delivery
- payout and payment visibility
- exception handling
- operator tooling
- support workflows
- monitoring and alerts where needed

### Expected outcomes
- a small live operation can run with clearer visibility and fewer manual rescue steps
- failures and delays are visible earlier and handled more consistently
- support and finance workflows are credible enough for routine operating use

### Success metrics
- manual intervention rate declines materially versus pilot
- delayed and failed orders are detected quickly enough for operational recovery
- operator response times are acceptable for live service management
- payment and payout status are visible enough to support day-to-day finance operations

## Stage 3 — Scale Foundation
### Goal
Prepare the platform for broader rollout and improved commercial efficiency.

### In scope
- subscription billing automation
- richer analytics and reporting
- referral tooling
- broader self-serve onboarding
- retention and optimisation features
- stronger operational efficiency tooling

### Expected outcomes
- growth does not require linear operational headcount growth
- the commercial model is easier to price, monitor, and improve
- the product becomes less dependent on high-touch onboarding and manual activation

### Success metrics
- onboarding effort per merchant declines
- recurring revenue administration becomes reliable and low-friction
- merchant and courier retention can be measured and improved with data
- operational efficiency improves without degrading delivery quality

## Cross-stage assumptions and dependencies
- the launch area remains geographically constrained during pilot
- a small number of merchants is preferable to broad but shallow activation
- third-party infrastructure should be bought where it reduces time-to-pilot materially
- some back-office support, payout handling, and exception management will remain manual until the economics justify automation
- compliance requirements must be met to the minimum credible operating standard before pilot orders go live
- roadmap sequencing assumes the company continues to prioritise live order completion over secondary monetisation or reporting features

## Progress tracking
Update this section directly as work moves. Use only the statuses below:
- Not started
- In progress
- Complete
- Deferred

| Workstream | Stage | Status | Notes |
| --- | --- | --- | --- |
| Core delivery orchestration foundations | Stage 1 | In progress | Dispatch, job lifecycle, proof of delivery, and payment foundations are present in the current repo, but pilot-grade ordering and merchant surfaces are not yet complete. |
| Restaurant onboarding and menu setup | Stage 1 | Not started | Sales-led onboarding is directionally defined, but the restaurant operating workflow is not yet the repo's primary completed surface. |
| Branded ordering and checkout flow | Stage 1 | Not started | Customer-facing ordering exists as roadmap scope, not as a complete pilot-ready product surface. |
| Basic restaurant visibility | Stage 1 | In progress | Business operations console and job views exist, but restaurant-specific workflows still need pilot framing. |
| Basic customer order visibility | Stage 1 | In progress | Tracking foundations exist, but a complete pilot customer experience is not yet the repo's finished path. |
| Minimum courier onboarding and compliance | Stage 1 | In progress | Driver-side operational flows exist, but compliance packaging should still be treated as pilot work. |
| Dispatch automation and operational hardening | Stage 2 | In progress | Release-safety, readiness checks, mapper hardening, and dispatch-read verification are underway. |
| Support, exception handling, and ops tooling | Stage 2 | In progress | Operator-facing flows exist in parts, but routine operating workflows are not yet complete. |
| Subscription billing automation | Stage 3 | Deferred | Not required for pilot. |
| Analytics, referrals, and optimisation tooling | Stage 3 | Deferred | Not required until after pilot proves the operating model. |

## Change control
Roadmap changes should be proposed as explicit scope decisions, not as silent drift.

When the roadmap changes:
1. update this file first
2. update `/Users/olubusayoadewale/Coding Projects/shipwright/docs/roadmaps/fleet-scope-cut-matrix.md` if scope decisions changed
3. update `/Users/olubusayoadewale/Coding Projects/shipwright/docs/roadmaps/fleet-pilot-readiness-checklist.md` if pilot gates changed
4. record the date, decision, rationale, and affected stage in the changed section or commit message

A valid roadmap change should answer four questions clearly:
- what changed
- why it changed
- what moved out of scope or into scope
- what this does to pilot timing, risk, or operating effort

## Next hardening candidate
Current likely next platform hardening candidate:
- operator dispatch mutations and adjacent offer-state transitions

Rationale:
- they change live operational state rather than only reading it
- they combine ownership checks, idempotency, outbox side effects, and timing-sensitive dispatch behavior
- they are the next most likely place for release-confidence gaps after the current jobs, quotes, payments, and driver-offers read hardening work
