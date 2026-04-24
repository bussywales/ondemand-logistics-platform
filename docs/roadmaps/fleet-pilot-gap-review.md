# Fleet Pilot MVP Gap Review

## Purpose
This review checks actual repo and recent delivery state against the Stage 1 working plan.

Its purpose is to prevent scope drift, expose false assumptions, and show what must happen next to make Pilot MVP credible.

## Evidence standard
This review uses a hard standard:
- backend capability does not count as a pilot-ready flow by itself
- operator tooling does not count as a restaurant or customer product surface
- seeded fixtures do not count as pilot operational readiness
- release hardening does not count as product completeness
- a workstream should not be treated as effectively complete unless the repo shows a usable actor-facing path plus the minimum operational handling around it

## Review basis
### Source documents reviewed
- `/Users/olubusayoadewale/Coding Projects/shipwright/docs/roadmaps/fleet-roadmap.md`
- `/Users/olubusayoadewale/Coding Projects/shipwright/docs/roadmaps/fleet-scope-cut-matrix.md`
- `/Users/olubusayoadewale/Coding Projects/shipwright/docs/roadmaps/fleet-pilot-readiness-checklist.md`
- `/Users/olubusayoadewale/Coding Projects/shipwright/docs/roadmaps/fleet-pilot-working-plan.md`

### Repo areas inspected
- `/Users/olubusayoadewale/Coding Projects/shipwright/apps/api`
- `/Users/olubusayoadewale/Coding Projects/shipwright/apps/web`
- `/Users/olubusayoadewale/Coding Projects/shipwright/packages/contracts`
- `/Users/olubusayoadewale/Coding Projects/shipwright/packages/db/migrations`
- recent commit history touching onboarding, jobs, dispatch, tracking, payments, release verification, and roadmap docs

## Stage 1 alignment summary
### Genuinely aligned with Pilot MVP
- core job, dispatch, tracking, proof-of-delivery, and payment foundations are in place
- business onboarding and authenticated dashboard entry exist in a real but still operator-facing form
- release reliability has materially improved through staging smoke checks, readiness checks, mapper hardening, and dispatch-read verification

### Partially aligned
- checkout and payment are technically present, but still attached to an operator console rather than a pilot customer flow
- courier offer, accept, and delivery flow is technically present, but still depends on courier compliance execution and live pilot validation
- restaurant and customer visibility exist in fragments, but not yet as usable pilot-facing surfaces

### Missing or underdeveloped
- restaurant onboarding workflow suitable for live pilot use
- menu setup and orderable catalogue
- branded customer ordering page
- complete customer order placement path tied to the pilot merchant experience
- explicit pilot operations playbooks for fallback, support, and reconciliation

### Drifting beyond Stage 1
- recent effort has concentrated on operational hardening, readiness, platform safety, and internal console behavior faster than on merchant/menu/customer pilot surfaces
- some of that work is justified by pilot risk, but none of it substitutes for the missing Stage 1 orderable product path

## Workstream-by-workstream assessment

### 1) Restaurant onboarding and menu setup
**Expected outcome**
At least one pilot restaurant can be onboarded, configured, and made orderable.

**Current evidence in repo / recent work**
- business org creation exists in `/Users/olubusayoadewale/Coding Projects/shipwright/apps/api/src/business/business.controller.ts`
- business onboarding UI exists in `/Users/olubusayoadewale/Coding Projects/shipwright/apps/web/app/_components/onboarding-flow.tsx`
- no menu tables or restaurant/menu management surfaces are present in `/Users/olubusayoadewale/Coding Projects/shipwright/packages/db/migrations`
- no restaurant-specific operating UI beyond general business dashboard context is evident

**Status assessment**
- Not started

**Key gaps**
- no menu model
- no restaurant onboarding workflow beyond generic business org creation
- no merchant activation path tied to a live pilot restaurant

**Scope comment**
Current repo state covers generic business onboarding, not restaurant onboarding for pilot trading.

### 2) Branded customer ordering flow
**Expected outcome**
A customer can browse a restaurant offering and place a real order through a branded surface.

**Current evidence in repo / recent work**
- web routes are concentrated around `/`, `/get-started`, `/app`, `/demo`, `/contact`
- no customer ordering route or orderable branded restaurant page is present under `/Users/olubusayoadewale/Coding Projects/shipwright/apps/web/app`
- recent web work focused on homepage, onboarding, dashboard shell, and payment panel behavior

**Status assessment**
- Not started

**Key gaps**
- no customer-facing ordering surface
- no browse-select-submit order flow
- no direct link between restaurant catalogue and checkout

**Scope comment**
This is a core Stage 1 gap. The repo has dashboard and onboarding work, not a real customer ordering product.

### 3) Checkout and payment
**Expected outcome**
A pilot customer can complete checkout and payment reliably enough for real orders.

**Current evidence in repo / recent work**
- payment foundation exists in `/Users/olubusayoadewale/Coding Projects/shipwright/apps/api/src/payments/payments.service.ts`
- Stripe-backed client collection exists in `/Users/olubusayoadewale/Coding Projects/shipwright/apps/web/app/_components/payment-method-form.tsx`
- payment panel logic exists in `/Users/olubusayoadewale/Coding Projects/shipwright/apps/web/app/_components/product-shell.tsx`
- payment UI is currently attached to an operator-facing console, not a restaurant-branded customer checkout experience

**Status assessment**
- At risk

**Key gaps**
- checkout is not yet connected to a real customer ordering flow
- commercial and payout handling remain only partially operational for pilot
- payment readiness is stronger technically than product-complete for Stage 1

**Scope comment**
The payment substrate is real. The pilot checkout product flow is not yet real.

### 4) Courier onboarding compliance
**Expected outcome**
A small pilot courier pool can be onboarded to the minimum credible compliance standard.

**Current evidence in repo / recent work**
- driver-side flows exist in `/Users/olubusayoadewale/Coding Projects/shipwright/apps/api/src/driver/driver.controller.ts` and `/Users/olubusayoadewale/Coding Projects/shipwright/apps/api/src/driver/driver.service.ts`
- compliance-related tables exist: `public.driver_verifications`, `public.driver_vehicle`
- staging fixture seeding exists in `/Users/olubusayoadewale/Coding Projects/shipwright/scripts/seed-staging-auth-fixtures.ts`
- current web onboarding for drivers is a staged handoff, not a finished pilot onboarding path

**Status assessment**
- At risk

**Key gaps**
- no explicit pilot compliance playbook or review workflow in docs
- no finished driver onboarding product path
- seeded fixtures exist, but operational readiness is still assumption-heavy

**Scope comment**
Technical foundations exist. Pilot-usable courier onboarding compliance is not yet evidenced as complete.

### 5) Courier offer / accept / delivery flow
**Expected outcome**
A courier can receive, accept, and complete a real delivery end-to-end.

**Current evidence in repo / recent work**
- offer endpoints exist: `/v1/driver/me/offers`, accept, reject, and job status transitions
- dispatch worker logic exists in `/Users/olubusayoadewale/Coding Projects/shipwright/apps/worker/src/index.ts`
- proof of delivery and delivered transitions exist in `/Users/olubusayoadewale/Coding Projects/shipwright/apps/api/src/driver/driver.service.ts`
- recent commits hardened tracking, driver offers release verification, and mapper safety

**Status assessment**
- At risk

**Key gaps**
- live end-to-end pilot validation still needs to be treated as pending
- courier operational readiness depends on the missing onboarding/compliance layer
- restaurant and customer product surfaces are not yet mature enough to make this a full pilot path on their own

**Scope comment**
This is one of the strongest Stage 1 technical areas. It is still not a pilot-ready flow because the actor-facing and operational dependencies are unfinished.

### 6) Dispatch and order-state operations
**Expected outcome**
Live orders can move safely through creation, dispatch, assignment, and completion states.

**Current evidence in repo / recent work**
- jobs, tracking, dispatch attempts, retry-dispatch, and reassign-driver exist in `/Users/olubusayoadewale/Coding Projects/shipwright/apps/api/src/jobs/jobs.service.ts`
- operator console supports dispatch-oriented actions in `/Users/olubusayoadewale/Coding Projects/shipwright/apps/web/app/_components/product-shell.tsx`
- recent work added readiness checks, staging smoke, dispatch-read verification, and mapper normalization

**Status assessment**
- In progress

**Key gaps**
- operator dispatch mutations remain the likely next hardening candidate
- current strength is on backend and ops console behavior, not on the full pilot merchant/customer experience

**Scope comment**
Real progress exists here. It is also ahead of more basic pilot needs such as merchant setup, menu, and customer ordering.

### 7) Basic customer and restaurant visibility
**Expected outcome**
Restaurants and customers can see enough order state to operate without constant clarification.

**Current evidence in repo / recent work**
- business operations console exists in `/Users/olubusayoadewale/Coding Projects/shipwright/apps/web/app/_components/product-shell.tsx`
- job detail, tracking, and payment state views exist
- no restaurant-specific order interface or customer-facing tracking page is clearly present in web routes

**Status assessment**
- At risk

**Key gaps**
- business console visibility is not the same as restaurant visibility
- tracking foundations exist, but customer-facing order visibility is not yet a finished Stage 1 surface

**Scope comment**
This workstream should not be described as effectively delivered. The repo supports internal visibility more than pilot actor-specific visibility.

### 8) Pilot operations and manual fallback processes
**Expected outcome**
The team can run the pilot even when automation fails.

**Current evidence in repo / recent work**
- release and staging verification docs are strong
- no equivalent pilot operations playbook for fallback dispatch, support, or reconciliation is evident in the docs set
- roadmap and checklist acknowledge manual workflows, but execution documentation is still thin

**Status assessment**
- Not started

**Key gaps**
- no documented manual dispatch fallback
- no support/escalation playbook for live pilot incidents
- no explicit payout/reconciliation operating owner

**Scope comment**
This is a pure Stage 1 need and is currently underdeveloped.

### 9) Release reliability / platform hardening
**Expected outcome**
Staging and release verification are disciplined enough that pilot traffic is not exposed to obvious avoidable failures.

**Current evidence in repo / recent work**
- staging smoke verification exists
- readiness schema checks exist
- dispatch-read smoke now includes driver offers
- repeated mapper failures have been hardened across jobs, quotes, tracking, and payments
- release/runbook docs are now structured and usable

**Status assessment**
- In progress

**Key gaps**
- next hardening tranche remains dispatch mutations and adjacent state changes
- release confidence does not remove the missing pilot product workstreams

**Scope comment**
This is one of the best-developed areas in the repo. It is useful and justified, but it should not become the substitute for Pilot MVP product delivery.

## False assumptions / overstatements to avoid
- backend orchestration exists, but a pilot-grade restaurant ordering flow does not
- business org onboarding exists, but restaurant onboarding and menu setup do not
- the operations console exists, but that is not the same as a complete restaurant or customer product surface
- payment primitives exist, but checkout is not yet a finished pilot customer flow
- driver-side technical flows exist, but pilot courier onboarding/compliance is not yet clearly operationalised
- staging hardening exists, but that does not mean pilot operations are ready
- release safety progress can create false comfort if merchant activation, menu, ordering, and fallback playbooks are still missing
- a technically successful job lifecycle should not be described as a Pilot MVP if customers and restaurants cannot yet use the product in a realistic pilot path

## Out-of-scope or premature work
Recent or active effort that looks more Stage 2-shaped than Stage 1-shaped:
- repeated operational hardening beyond the basic pilot actor flows
- internal operations console depth ahead of restaurant and customer-facing pilot surfaces
- some payment and payout foundation work that is useful, but more advanced than the current pilot ordering reality
- driver offers / dispatch read verification before the pilot merchant/menu/order surfaces are complete

This work is not necessarily wrong. It becomes a problem only if it delays the missing Stage 1 product path.

## Top Stage 1 gaps
1. restaurant onboarding and menu setup are not yet real pilot workflows
2. there is no complete branded customer ordering flow
3. checkout exists technically, but not yet as part of a finished customer order path
4. pilot courier onboarding compliance is not yet operationally defined enough
5. pilot manual fallback, support, and reconciliation processes are not yet documented as execution assets

## Recommended next execution tranche

### 1) Pilot restaurant onboarding path
**Why it matters now**
No pilot exists without at least one real merchant that can be activated cleanly.

**Dependencies**
- pilot merchant commitment
- commercial terms
- owner for onboarding and content operations

**Success condition**
A named pilot restaurant can be onboarded, configured, and prepared for live ordering.

### 2) Menu and orderable catalogue path
**Why it matters now**
The platform cannot trade live pilot orders without a usable menu surface.

**Dependencies**
- restaurant onboarding path
- content model or manual menu-loading process

**Success condition**
At least one pilot restaurant has a loaded, orderable catalogue.

### 3) Branded customer ordering plus checkout path
**Why it matters now**
This is the missing center of Stage 1. Without it, the current platform remains operator-heavy rather than pilot-ready.

**Dependencies**
- menu path
- existing payment foundation
- order creation integration

**Success condition**
A customer can place and pay for a real pilot order through a branded restaurant flow.

### 4) Pilot courier compliance and activation package
**Why it matters now**
Courier dispatch is only pilot-usable if the courier pool is actually approved and operationally valid.

**Dependencies**
- compliance decisions
- driver review owner
- small seeded pilot courier set

**Success condition**
At least one courier can be approved and activated under the defined pilot minimum standard.

### 5) Pilot fallback and support playbooks
**Why it matters now**
Pilot risk is operational, not only technical. Manual steps are acceptable only if they are explicit.

**Dependencies**
- order-state visibility
- payment visibility
- named operations owner

**Success condition**
Dispatch fallback, support escalation, and payout/reconciliation handling are written down and owned.

## Stop / defer list
Do not prioritise the following now unless they directly unblock the five items above:
- subscription billing automation
- advanced analytics and reporting
- referral tooling
- richer courier earnings tooling
- polished admin surfaces beyond immediate pilot need
- broader self-serve onboarding
- optimisation and retention features
- additional Stage 2 dispatch automation beyond the minimum needed for pilot execution

## Reassessment of Pilot MVP status
- not yet credible

Reason:
The repo is increasingly credible on backend orchestration, release hardening, and operator tooling, but those are not the same thing as a pilot-ready product. The Pilot MVP still lacks several first-order Stage 1 realities: restaurant onboarding, menu setup, a branded customer ordering path, and explicit pilot operations playbooks.
