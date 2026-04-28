# Fleet UX Authority Brief

## Purpose
This brief defines the product experience standard for Fleet.

Use it before further UI work on merchant setup, customer ordering, courier flows, and operations tooling. It exists to stop Fleet evolving screen by screen without a coherent experience model.

This is not a visual inspiration note. It is the authority document for deciding what future UI work should communicate, prioritise, simplify, and refuse.

## Current problem
The current UI/UX is not good enough for the product Fleet needs to become.

The repo now contains useful foundations:
- business onboarding and authenticated app entry
- an operations console with jobs, tracking, and payment state
- a pilot restaurant setup surface
- a public restaurant-by-slug ordering route
- local cart behaviour for customer ordering

Those foundations do not yet equal a strong product experience.

Current risks:
- the experience still feels too much like internal tooling in several places
- page hierarchy often presents state and controls before the user journey is clear
- primary actions are sometimes visible, but not always dominant enough
- restaurant setup still behaves like setup CRUD rather than guided merchant activation
- customer ordering exists as a foundation, but is not yet the emotional centre of the product
- operations surfaces can drift into data dumps if attention and next action are not made obvious
- raw operational concepts, backend labels, and status details can leak into user-facing flows
- empty and loading states are functional, but must do more to guide action and reduce hesitation

The product cannot win by becoming a prettier admin panel. It needs a tighter journey model.

## Product Posture
Fleet should feel like a premium logistics operating product.

It should communicate:
- speed without chaos
- trust without corporate heaviness
- operational control without clutter
- commercial credibility without generic SaaS polish
- calm execution under pressure
- clear ownership of every next action

The product should feel useful before it feels decorative. It should make restaurants confident to trade, customers confident to order, couriers confident to accept work, and operators confident to intervene.

Fleet should not feel like:
- a generic dashboard template
- a CRUD admin system
- a public prototype
- an enterprise back office
- a marketing site pretending to be a product

## Primary User Journeys

### 1. Merchant / Restaurant
**Main flows**
- create or activate the restaurant workspace
- set the restaurant identity and orderable menu
- understand whether the restaurant is live
- see incoming and active orders at a basic pilot level
- know what needs action next

**Experience goal**
The merchant should feel that setup is controlled, finite, and tied directly to going live.

**Good UX should make them feel**
- "I know what is left before I can take orders."
- "My menu is represented the way customers will see it."
- "I can trust this system with live orders."

### 2. Customer
**Main flows**
- open a restaurant page by slug or branded link
- understand the restaurant is available for ordering
- browse the menu
- select items and adjust quantities
- review the cart
- check out and receive confirmation
- follow basic order status

**Experience goal**
The customer should move from intent to order with minimal uncertainty.

**Good UX should make them feel**
- "This restaurant is real and available."
- "I know what I am ordering and what it costs."
- "Checkout and delivery status are trustworthy."

### 3. Courier
**Main flows**
- complete minimum pilot onboarding and compliance
- receive an offer
- understand route, timing, and payout
- accept or reject quickly
- progress pickup, delivery, and proof of delivery

**Experience goal**
The courier should feel the work is clear, fair, and easy to execute.

**Good UX should make them feel**
- "I know the job before accepting it."
- "The next action is obvious."
- "Completion and proof requirements are unambiguous."

### 4. Operator / Internal Team
**Main flows**
- monitor active jobs
- identify exceptions
- retry dispatch, reassign, or cancel when needed
- inspect tracking and payment state
- support restaurants, customers, and couriers during pilot operations

**Experience goal**
Operators should see the decisions they need to make, not just the data the system has.

**Good UX should make them feel**
- "I can see what needs attention."
- "I know which action is safest."
- "I can recover a pilot incident without improvising."

## Experience Principles

### One screen, one dominant purpose
Every page must have a primary job. If the page is for setup, make setup completion dominant. If it is for ordering, make item selection and checkout dominant. If it is for operations, make attention and intervention dominant.

### One primary action per page or section
Avoid equal-weight actions. The product should make the next best action visually obvious and relegate secondary actions.

### Show journey, not just data
Fleet is not a database viewer. Merchant setup, customer ordering, courier fulfilment, and operations intervention must all show where the user is in the journey and what happens next.

### Hide complexity until needed
Operational detail matters, but it should not dominate first contact. Show enough to act, then reveal deeper state only when the user needs to diagnose or intervene.

### Empty states must instruct
Empty states should explain what is missing, why it matters, and the next action. "No items" is weaker than "Add the first menu item so customers can begin ordering."

### Status should be visual before verbal
Use consistent visual state for live, blocked, complete, delayed, unavailable, and attention states. Text labels should clarify, not carry the whole burden.

### Reduce visual noise
Premium comes from discipline: fewer boxes, stronger hierarchy, clearer spacing, and less decorative layout furniture.

### Use actor language, not backend language
Customer and merchant surfaces should not expose backend concepts unless they are meaningful to that actor. Internal status can stay in operations tools, but public flows need human language.

### Fail clearly and recoverably
Errors must state what happened, whether the user can retry, and what to do next. Raw backend messages and generic request failures do not meet the standard.

## Visual Direction
Fleet should look like a restrained, modern logistics operating system.

The visual language should be:
- high contrast
- clean
- direct
- calm
- precise
- commercially serious
- minimal without feeling unfinished

### Typography
Use typography to establish hierarchy quickly. Headlines should be sharp and functional. Labels should be compact. Operational data should be legible under pressure.

### Spacing
Use spacing to group decisions and steps. Avoid padding that makes the product feel padded-out or marketing-heavy.

### Surfaces
Use cards sparingly. Cards are for meaningful grouped objects, not for wrapping every section. Prefer rows, sections, and clear alignment when the user is comparing operational data.

### Colour
Keep colour restrained. Neutral surfaces should dominate. Accent colour should support primary action and important state, not decorate the page.

### State Styling
Status treatment must be consistent across merchant, customer, courier, and operator surfaces. Critical states should be visible quickly. Do not rely only on uppercase text badges.

### Motion
Use motion only to improve comprehension: loading, transition, confirmation, or state change. Avoid decorative animation that slows operational confidence.

### Avoid
- generic Bootstrap or template SaaS styling
- enterprise ugliness
- decorative gradients and visual noise
- dashboard graveyard layouts
- excessive cards
- exposed technical labels on customer or merchant flows
- raw error strings
- equal-weight CTAs

## UX Architecture Changes Needed

### Merchant setup should become guided activation
**Current risk**
The pilot restaurant setup surface proves the data path, but still feels like an internal setup panel: create restaurant, add category, add item, view menu.

**Target model**
Merchant setup should become an activation journey:
1. restaurant identity
2. operating readiness
3. menu composition
4. publish or confirm live status
5. receive orders

The user should always know what remains before the restaurant can trade.

### Menu management should feel like composition, not CRUD
**Current risk**
Menu category and item forms can make the restaurant feel like data entry.

**Target model**
The menu builder should show the menu as the customer will experience it. Adding or editing an item should feel like composing an orderable catalogue, not maintaining database records.

### Customer ordering should become the emotional centre
**Current risk**
The public restaurant route and cart foundation are a necessary base, but the current experience is still a controlled functional surface.

**Target model**
The customer ordering flow should be the strongest actor-facing product experience in Stage 1. It needs restaurant identity, clear availability, confident item selection, a visible cart, checkout readiness, and understandable failure states.

### Jobs and operations should become decision surfaces
**Current risk**
Operations pages can accumulate tables, status badges, and action panels until the operator has to hunt for the right decision.

**Target model**
Operations should prioritise attention, exception handling, and next safe action. The console should answer:
- what is happening now
- what is at risk
- what needs intervention
- what action should be taken

### Courier flows should prioritise offer clarity
**Current risk**
Backend offer and delivery state can exist without a courier feeling confident about accepting work.

**Target model**
Courier UX should make route, distance, timing, payout, and next action instantly clear. Compliance requirements should feel finite and practical.

## UI System Recommendations

### Navigation
Navigation should be actor-specific and minimal. Do not mix merchant setup, customer ordering, courier work, and operator tooling into one generic navigation model.

### Page headers
Every page header should state the page purpose and expose the primary action when relevant. Avoid headings that only name the table or backend object.

### Cards
Use cards for meaningful entities or workflows. Avoid using cards as default containers for every layout section.

### Forms
Forms should be grouped by outcome, not database structure. Labels should be plain. Submission buttons should describe the result: "Create restaurant", "Add menu item", "Open checkout", "Retry dispatch".

### Tables and rows
Use tables and dense rows mainly for operations. Rows should support comparison and action. If every row has status, route, owner, timing, and action, the hierarchy must remain scannable.

### Status badges
Status labels must be normalised and actor-appropriate. Backend states may exist in code, but user-facing labels should be understandable.

### Loading states
Loading states should be specific enough to reduce confusion. "Loading menu" is better than a generic spinner. Long auth restore states should fail closed and explain what is happening.

### Error states
Errors should never expose raw request failures in primary user journeys. State the issue, the likely recovery action, and when the user should contact support.

### Empty states
Empty states must be productive. They should explain the missing object and offer the next action when the user has permission to perform it.

### Customer cart and checkout
Cart should show quantities, line totals, subtotal, and the checkout state clearly. Do not imply checkout is live until payment and order submission are genuinely connected.

## What To Reduce Or Remove
Reduce or remove:
- equal-weight action groups
- boxy admin-panel layouts
- decorative surfaces that do not support decision-making
- raw backend labels on merchant and customer pages
- raw request error messages
- generic empty states
- dense status exposure before journey context
- forms that mirror database structure rather than user intent
- isolated widgets without a clear flow
- marketing copy inside operational tasks
- operations-console patterns leaking into customer ordering

## Redesign Priority Order

### 1. Merchant setup and menu builder
This comes first because the restaurant must be activated and menu-loaded before customer ordering can be credible. The target is not polish; it is guided activation and menu confidence.

### 2. Customer ordering flow
This is the commercial centre of Stage 1. A pilot is not credible until a customer can browse, choose, check out, and understand order state through a branded flow.

### 3. Jobs and operations surface
Operations already has more functional foundation than merchant/customer flows. Redesign should follow once the ordering path feeds real jobs into the console, so the console can be shaped around actual pilot operations.

Courier experience should be tightened when it directly blocks courier acceptance, completion, or pilot compliance. Do not let courier polish overtake the merchant-menu-ordering spine unless pilot execution requires it.

## Success Criteria

### Merchant setup
- the merchant can see where they are in activation
- the next action is obvious
- the menu is represented as customers will see it
- setup errors are understandable and recoverable
- the restaurant's live or not-live state is clear

### Customer ordering
- the restaurant page feels real, available, and trustworthy
- menu browsing is clear
- item selection and cart updates are immediate
- checkout readiness is unambiguous
- failures do not feel like technical breakage

### Operations
- attention states are visible without hunting
- operator actions are immediate and clearly scoped
- job detail pages separate summary, route, driver, timeline, tracking, and payment clearly
- raw data supports decisions instead of replacing them

### Overall product feel
- users hesitate less
- primary actions are obvious
- status is easier to interpret
- error recovery is clearer
- screens feel connected into journeys
- product polish comes from restraint, not decoration

## Rules For Future Codex UI Work
- Future UI work must reference this brief before implementation.
- "Make it prettier" is not a valid instruction.
- Redesign tasks must specify the actor, flow, page purpose, and primary action.
- Stage 1 UI work must prioritise pilot-critical flows over general polish.
- Backend or internal progress does not count as UX success.
- Do not redesign a screen without preserving or improving the user journey it serves.
- Do not add decorative UI unless it improves clarity, trust, or completion.
- Do not pull Stage 2 or Stage 3 product polish into Stage 1 unless it directly unblocks Pilot MVP.
- If scope is unclear, default back to the Stage 1 spine: merchant activated -> menu loaded -> customer order placed and paid.

## Change Control
This brief should evolve only when the roadmap or product posture changes materially.

When future UX direction changes:
- record the reason
- identify the affected actor and journey
- update this brief or the relevant roadmap document in the same change
- avoid one-off screen redesigns that contradict this authority without updating it
