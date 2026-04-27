# Fleet Stage 1 Execution Tranche 01

## Purpose
This document turns the Stage 1 gap review into the next concrete build sequence.

It is the execution control document for the missing Stage 1 spine:
- restaurant activated
- menu loaded and orderable
- customer order placed and paid

Everything in this tranche must serve that connected path directly.

It must stay aligned with:
- `/Users/olubusayoadewale/Coding Projects/shipwright/docs/roadmaps/fleet-roadmap.md`
- `/Users/olubusayoadewale/Coding Projects/shipwright/docs/roadmaps/fleet-scope-cut-matrix.md`
- `/Users/olubusayoadewale/Coding Projects/shipwright/docs/roadmaps/fleet-pilot-readiness-checklist.md`
- `/Users/olubusayoadewale/Coding Projects/shipwright/docs/roadmaps/fleet-pilot-working-plan.md`
- `/Users/olubusayoadewale/Coding Projects/shipwright/docs/roadmaps/fleet-pilot-gap-review.md`

## Tranche goal
Activate at least one pilot restaurant, make its menu orderable, and allow a customer to place and pay for a real order through a branded flow.

That is the only success condition for this tranche.

## Why this tranche now
- Pilot MVP is not credible without a real merchant-menu-ordering path.
- The repo is stronger on backend orchestration and operator tooling than on actor-facing Stage 1 product flow.
- Business onboarding, jobs, dispatch, tracking, and payment foundations already exist, but they do not yet create a usable pilot restaurant order path.
- This tranche is the missing centre of Stage 1. Without it, the project remains operationally interesting but commercially unproven.

## Tranche control rules
- Work only on the minimum connected build sequence.
- Do not pull forward Stage 2 operations work unless it directly blocks the first restaurant order path.
- Do not build management polish before the underlying path exists.
- Do not count internal tooling or backend capability as completion for this tranche.
- If a work item does not help one restaurant go live, show its menu, or let one customer place and pay for one order, it is outside this tranche.

## Minimum connected build sequence
1. create and activate one pilot restaurant
2. attach an orderable menu to that restaurant
3. expose that menu on a branded customer route
4. let a customer select items and check out
5. create a real order that enters the existing downstream quote, job, payment, and operational flow

The tranche is incomplete if any link in this chain is missing.

## Scope of this tranche

### 1. Pilot restaurant onboarding path
**Target outcome**
A named pilot restaurant can be created, activated, and prepared to receive live orders.

**Repo assets that appear reusable**
- business auth and org creation in `/Users/olubusayoadewale/Coding Projects/shipwright/apps/web/app/_components/onboarding-flow.tsx`
- business context and org membership APIs in `/Users/olubusayoadewale/Coding Projects/shipwright/apps/api/src/business`
- protected business app entry and session handling in `/Users/olubusayoadewale/Coding Projects/shipwright/apps/web/app/_components/business-auth-provider.tsx`

**Missing pieces**
- restaurant-specific activation flow beyond generic business org creation
- explicit restaurant profile and pilot activation state
- clear handoff from generic business onboarding to merchant setup for live trading

**What must be built now**
- minimum restaurant activation path for one pilot merchant
- minimum restaurant profile or operating record needed to support ordering
- explicit post-onboarding path from business setup into merchant setup

**What can remain manual for pilot**
- merchant approval review
- data verification and commercial sign-off
- activation checklist execution by operator

**Dependencies**
- named pilot merchant
- agreed pilot commercial terms
- owner for merchant activation

**Risks**
- generic business onboarding may be mistaken for restaurant onboarding when it is not sufficient
- merchant activation can drift into admin-tool work unless kept narrow

### 2. Menu and orderable catalogue path
**Target outcome**
The pilot restaurant has a loaded, orderable catalogue that can power a customer-facing order flow.

**Repo assets that appear reusable**
- existing authenticated business app shell in `/Users/olubusayoadewale/Coding Projects/shipwright/apps/web/app/app`
- current contracts and DB migration patterns in `/Users/olubusayoadewale/Coding Projects/shipwright/packages/contracts` and `/Users/olubusayoadewale/Coding Projects/shipwright/packages/db/migrations`
- existing quote, job, and payment downstream foundations in `/Users/olubusayoadewale/Coding Projects/shipwright/apps/api/src/quotes`, `/Users/olubusayoadewale/Coding Projects/shipwright/apps/api/src/jobs`, and `/Users/olubusayoadewale/Coding Projects/shipwright/apps/api/src/payments`

**Missing pieces**
- no evident restaurant menu data model in current migrations
- no menu management surface
- no orderable catalogue read path for a customer surface

**What must be built now**
- minimum catalogue data model for pilot ordering
- minimum menu loading or management path
- minimum published catalogue read path for the customer ordering surface

**What can remain manual for pilot**
- menu content entry
- image handling and copy cleanup
- catalogue review and publishing decisions

**Dependencies**
- activated pilot restaurant
- pilot menu source data
- pricing and availability rules kept intentionally simple

**Risks**
- overdesigning catalogue tooling before proving basic ordering
- building management polish before defining the minimum orderable model

### 3. Branded customer ordering plus checkout path
**Target outcome**
A customer can browse the pilot restaurant menu, select items, check out, and create a real order that enters the existing backend lifecycle.

**Repo assets that appear reusable**
- existing Next.js web app structure in `/Users/olubusayoadewale/Coding Projects/shipwright/apps/web/app`
- payment method collection foundations in `/Users/olubusayoadewale/Coding Projects/shipwright/apps/web/app/_components/payment-method-form.tsx`
- payment authorization and state APIs in `/Users/olubusayoadewale/Coding Projects/shipwright/apps/api/src/payments`
- quote and job foundations in `/Users/olubusayoadewale/Coding Projects/shipwright/apps/api/src/quotes` and `/Users/olubusayoadewale/Coding Projects/shipwright/apps/api/src/jobs`
- business and operator visibility surfaces in `/Users/olubusayoadewale/Coding Projects/shipwright/apps/web/app/_components/product-shell.tsx` for downstream verification only

**Missing pieces**
- no branded restaurant ordering route
- no customer browse-select-submit flow
- no cart model or checkout embedded inside a customer ordering path
- no actor-facing order confirmation or failure states for a customer

**What must be built now**
- branded restaurant ordering route/page
- item selection and cart flow
- checkout inside the real customer path
- order submission that hands off into the existing quote/job/payment lifecycle
- minimum customer confirmation and failure handling

**What can remain manual for pilot**
- customer support follow-up
- order correction outside the initial happy path
- some payment exception handling behind the scenes

**Dependencies**
- activated restaurant and orderable catalogue
- live payment configuration suitable for pilot
- chosen order-creation handoff into existing backend lifecycle

**Risks**
- forcing operator-console primitives directly into customer UX
- assuming payment substrate equals usable checkout product flow
- leaking Stage 2 visibility or automation requirements into the first customer flow

## Existing repo assets to reuse
Use the current foundations where they reduce build time without distorting the product shape.

- **Business auth and org setup**
  - reusable as the base for merchant operator identity and account ownership
  - current assets: `/Users/olubusayoadewale/Coding Projects/shipwright/apps/api/src/business`, `/Users/olubusayoadewale/Coding Projects/shipwright/apps/web/app/_components/onboarding-flow.tsx`
- **Session and protected app entry**
  - reusable for merchant-side setup and internal management paths
  - current assets: `/Users/olubusayoadewale/Coding Projects/shipwright/apps/web/app/_components/business-auth-provider.tsx`, `/Users/olubusayoadewale/Coding Projects/shipwright/apps/web/middleware.ts`
- **Payment foundation**
  - reusable for the actual payment rail and authorization state model
  - current assets: `/Users/olubusayoadewale/Coding Projects/shipwright/apps/api/src/payments`, `/Users/olubusayoadewale/Coding Projects/shipwright/apps/web/app/_components/payment-method-form.tsx`
- **Quote and job lifecycle foundations**
  - reusable as the downstream order execution path after customer submission
  - current assets: `/Users/olubusayoadewale/Coding Projects/shipwright/apps/api/src/quotes`, `/Users/olubusayoadewale/Coding Projects/shipwright/apps/api/src/jobs`, `/Users/olubusayoadewale/Coding Projects/shipwright/apps/worker/src/index.ts`
- **Operator visibility and release hardening**
  - reusable to observe and validate the first pilot order path once created
  - current assets: `/Users/olubusayoadewale/Coding Projects/shipwright/apps/web/app/_components/product-shell.tsx`, staging smoke and readiness scripts under `/Users/olubusayoadewale/Coding Projects/shipwright/apps/api/scripts`

## Missing implementation areas
- restaurant-specific activation model and operating setup path
- menu and catalogue data model
- menu management or load path suitable for one pilot merchant
- branded customer ordering route and UI
- item selection and cart behaviour
- checkout embedded in a real customer order path
- actor-facing success and failure states for customer ordering
- clear order-creation handoff from customer order to existing quote/job lifecycle

## Manual now vs build now

### Manual now
These can remain manual in this tranche if they are explicitly owned:
- merchant activation review and commercial sign-off
- menu content entry and corrections
- pilot onboarding checks that do not need software enforcement yet
- early support handling for failed or corrected orders
- payout and reconciliation handling behind the scenes

### Build now
These are non-negotiable for this tranche:
- minimum restaurant activation path
- orderable catalogue representation
- branded customer ordering surface
- cart and checkout inside that customer flow
- order creation handoff into the existing backend lifecycle
- minimum actor-facing confirmation and failure states

## Tranche deliverables
Only the following outputs count for tranche completion:
- pilot restaurant activation path defined and working for at least one named merchant
- minimum restaurant and menu data model sufficient for pilot ordering
- initial menu loading or management path
- branded restaurant ordering route/page
- item selection and cart flow
- checkout integrated into the customer order path
- successful order creation into the existing downstream quote, job, and payment lifecycle
- minimum customer confirmation and failure-state handling

## Acceptance criteria
This tranche is complete only when all of the following are true:
- a named pilot restaurant can be created and activated on the intended path
- menu items for that restaurant can be loaded and displayed in an orderable form
- a customer can browse the menu, select items, and submit an order
- checkout succeeds on the intended pilot payment rail
- a real order record is created and is visible in the downstream operational flow already present in the repo
- the resulting order can be observed by operators without custom one-off inspection work
- customer-facing failure states are understandable enough for controlled pilot use
- the result is sufficient for a controlled pilot test even if merchant review, menu loading, support, and reconciliation still depend partly on manual operations

The tranche is not complete if the repo has:
- a backend-only implementation with no actor-facing ordering path
- a branded ordering page with no real orderable menu behind it
- checkout UI with no reliable order creation handoff

## Dependencies and blockers
- named pilot restaurant and pilot commercial terms
- decision on the minimum restaurant profile required before activation
- pilot menu source data and owner for content entry
- decision on the initial customer order payload shape and how it maps into quote/job creation
- live payment configuration suitable for real pilot checkout
- operational owner for merchant setup, payment exceptions, and order support

## Not in this tranche
Do not pull the following into this work unless they directly unblock the merchant-menu-ordering spine:
- advanced analytics and reporting
- referral tooling
- subscription billing automation
- polished internal admin tooling
- rich courier earnings tooling
- Stage 2 dispatch automation improvements
- broader self-serve onboarding beyond the minimum pilot path
- scale-grade optimisation or retention features
- courier-product expansion beyond what is already needed to receive and fulfil the first valid order
- operator-console expansion beyond what is required to observe the resulting order

## Recommended execution order
1. define the minimum pilot restaurant activation record and path
2. define the minimum catalogue model needed for ordering
3. implement the minimum menu loading or management path
4. implement the branded restaurant ordering route and browse flow
5. implement cart, checkout, and order submission
6. validate the handoff into the existing quote, job, payment, and operator visibility flow

## Suggested next build task
Define and implement the minimum restaurant and menu data model for one pilot merchant.

Reason:
- it is the foundation for both merchant activation and customer ordering
- the repo currently has no clear menu or catalogue model to build the rest of the tranche on
- it is the narrowest first task that prevents fake progress on branded ordering UI without a real orderable catalogue behind it
