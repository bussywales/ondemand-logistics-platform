# AI-Assisted Command Centre Roadmap

## Purpose
This roadmap defines how ShipWright should evolve from a delivery and job management product into an AI-assisted logistics command centre for local commerce.

The direction is deliberate:
- AI should strengthen operator judgment
- AI should improve visibility, triage, recovery, and communication
- AI should not silently automate high-risk decisions during pilot-stage operations

This is not a gimmick-AI roadmap. It is an operations-intelligence roadmap built on top of the operational foundations already present in ShipWright.

## Revised Product Positioning
### Current positioning
ShipWright today is a Stage 1 logistics operations product with:
- merchant setup and menus
- public customer ordering
- Stripe-backed payment authorisation and capture proof
- order and job lifecycle handling
- driver execution and proof of delivery
- payment risk visibility
- notifications, admin oversight, public tracking, and proof tooling

### Target positioning
ShipWright should become:

**An AI-assisted logistics command centre for local commerce operators, restaurants, retailers, dispatch teams, and couriers.**

The command-centre posture means ShipWright should help people:
- see what matters first
- understand why a delivery or payment risk is emerging
- recover faster when the happy path breaks
- communicate better with customers and merchants
- review exceptions with evidence, not guesswork
- close the day with usable operational summaries

## Strategic Principles
### 1. Operator-first AI
AI should support the operator, not bypass them.

### 2. Human approval on high-risk actions
During pilot-stage operations, AI may recommend. It must not silently execute sensitive decisions.

### 3. Evidence before recommendation
No recommendation system should ship without the instrumentation needed to explain and review its judgment.

### 4. Practical operations over novelty
The first AI features should save operator time on triage, briefing, incident understanding, and communication.

### 5. Staged autonomy
ShipWright should move from visibility -> recommendation -> operator-assisted action -> tightly governed automation. It should not jump directly to autonomy.

## What Is Already Implemented Operational Foundation
These are already present in the product or staging proof loop and form the base layer for assistive AI:
- merchant setup and menu surfaces
- public customer ordering
- Stripe payment authorisation/capture proof
- business orders queue
- job and dispatch lifecycle
- driver execution route
- proof of delivery
- payment risk visibility
- notifications
- admin control plane
- public tracking
- release verification and proof archive
- pilot playbooks
- controlled demo/tester runbooks

These are not AI capabilities. They are the operational substrate AI will depend on.

## AI Capability Layers
### Layer 0: Operational foundation
Already in place or actively being hardened.

### Layer 1: Assistive intelligence
Summaries, triage, detection, and suggested next steps.

### Layer 2: Recommendation systems
Ranked suggestions for operator choice, with rationale and confidence.

### Layer 3: Controlled workflow assistance
Drafted messages, suggested actions, and batch review queues, still requiring operator approval.

### Layer 4: Deferred automation
Tightly governed automation only after sufficient evidence, controls, and operating maturity exist.

## Operator-First AI Features
These are the most credible near-term AI features because they amplify the current operator workflow.

### Daily operator briefing
A start-of-shift briefing summarising:
- orders at risk
- dispatch failures
- delayed orders
- high-risk payment states
- drivers currently unavailable or unreliable
- unresolved incidents from the previous shift

Daily Operator Briefing v1 should be deterministic and rules-based, not LLM-generated. It should behave as a human-readable operating brief built from current platform signals, with explicit evidence and operator review links.

### Failed dispatch recovery suggestions
For `DISPATCH_FAILED` or slow-dispatch jobs, AI should suggest:
- likely reason category
- next recommended action
- whether to retry dispatch, reassign, contact restaurant, or cancel
- which playbook to open

Command Intelligence v1B should remain deterministic and rules-based:
- no LLM dependency
- no autonomous retry, assignment, cancellation, or refund
- explicit evidence for each suggestion
- operator approval required before any recovery action

### Courier assignment recommendations
Recommend the best available courier based on:
- vehicle suitability
- proximity or last known operating area
- current workload
- offer acceptance history
- recent completion reliability

During pilot, this must remain a recommendation only.

### Order delay detection
Detect when an order is slipping relative to expected progression:
- payment authorised but no dispatch progress
- driver assigned but pickup not progressing
- picked up but drop-off timing drifting
- stale driver/job state vs expected stage timing

### Customer communication suggestions
Draft, but do not send automatically:
- delay notices
- dispatch issues
- proof-of-delivery completion messages
- refund or cancellation apology messages

### Refund and escalation triage
Suggest:
- whether the issue looks operational, payment-related, or merchant-related
- whether refund review is likely needed
- who should own the escalation
- which evidence is missing before a decision is made

### Manual override recommendations
When an operator is about to retry dispatch, reassign, or cancel, AI should summarise:
- likely outcome
- relevant recent events
- current risk posture
- safest next action candidates

### AI-generated incident summaries
Turn noisy timelines into a concise operational narrative:
- what happened
- when it diverged from normal flow
- who touched it
- what actions were already attempted
- what should happen next

### End-of-day operations report
Generate a shift closeout summary covering:
- total orders
- delayed orders
- dispatch failures
- payment risk cases
- refunds/escalations opened
- top recurring failure categories
- notable courier or merchant operational signals

### Pilot readiness command dashboard
A command summary that answers:
- is the system healthy enough to run a controlled session now?
- what are the current blockers?
- what changed since the last proof?
- which routes or roles need manual recheck before a demo or tester window?

## Merchant-Facing AI Features
These should follow after operator intelligence, not before.

### Restaurant readiness checks
Pre-service checks such as:
- menu completeness
- item availability assumptions
- stale menu updates
- order backlog risk
- operating window mismatch

### Merchant performance summaries
Provide merchant-facing summaries of:
- on-time readiness
- fulfilment bottlenecks
- cancellation patterns
- average order handling posture
- common support or exception themes

### Draft merchant communications
Generate, but do not send automatically:
- service issue summaries
- backlog risk notices
- menu or readiness reminders
- end-of-day merchant summaries

## Courier And Dispatch Intelligence Features
### Courier recommendation and ranking
Recommend likely best-fit drivers for a job.

### Driver reliability scoring
Score should be used carefully and transparently.

Potential signal sources:
- offer acceptance rate
- cancellation rate
- completion rate
- lateness patterns
- no-show patterns
- stale location or availability behaviour

This score must not be used to silently penalise or suspend couriers during pilot.

### Dispatch anomaly detection
Detect patterns such as:
- repeated rejections for a route type
- repeated expiry for a geography or time window
- mismatch between required vehicle and active fleet mix
- repeated manual overrides by operators

## Risk Controls And Human-In-The-Loop Design
### Hard rules during pilot
AI must not automatically:
- refund
- cancel orders
- assign drivers without operator approval during pilot
- suspend or penalise couriers
- send customer messages without approval
- override payments
- close incidents

### Recommendation design rules
Every recommendation should include, where practical:
- reason or rationale
- supporting signals
- timestamps or event references
- confidence band or posture label
- operator confirmation step

### Reviewability
Every AI-assisted decision surface should preserve:
- operator action taken
- recommendation shown
- whether it was accepted, edited, or rejected
- resulting operational outcome when measurable

## Instrumentation Required Before AI Recommendations
No serious recommendation layer should ship before this data is reliably captured.

### Required instrumentation
- stage timestamps
- dispatch attempts
- driver offer outcomes
- payment events
- cancellation reasons
- refund reasons
- operator overrides
- support notes
- incident categories

### Strongly recommended additional instrumentation
- assignment/reassignment rationale
- communication touchpoints with customer or merchant
- order delay cause tags
- courier availability transitions
- stale-state detection markers
- playbook used during recovery

## Pilot-Stage Implementation Plan
### Stage 1 posture
Current Stage 1 should remain focused on:
- trustworthy operational data
- clear operator surfaces
- repeatable staging proof
- safe manual intervention

### Tranche 2A: Command Intelligence v1
Recommended next build tranche:
- daily operator briefing
- failed dispatch recovery suggestions
- delay detection
- AI-generated incident summaries
- end-of-day operations report
- pilot readiness command dashboard

Why this tranche first:
- it provides clear operational value
- it stays human-in-the-loop
- it does not require silent automation
- it makes the existing command surfaces more useful without rewriting core workflows

The first shipping slice of Tranche 2A should remain deterministic and human-in-the-loop even though the broader product direction is AI-assisted.

### Tranche 2B: Dispatch Intelligence v1
After Tranche 2A and sufficient instrumentation:
- courier assignment recommendations
- driver reliability scoring for review use only
- manual override recommendations
- order risk and anomaly triage

### Tranche 2C: Communication Assistance v1
After stable operator-intelligence usage:
- customer communication suggestions
- merchant readiness checks
- refund/escalation triage drafts
- merchant performance summaries

### Tranche 3: Governed workflow assistance
Only after evidence and review controls are mature:
- batch review queues
- structured operator approvals for recommended actions
- limited one-click execution with audit trails

### Deferred automation phase
Only after repeated evidence, policy design, and operational sign-off:
- selective low-risk automation candidates
- still no silent high-risk action execution without explicit governance

## What Not To Build Yet
Do not build these now:
- autonomous refund handling
- autonomous driver assignment in pilot
- autonomous cancellation handling
- AI customer messaging without approval
- black-box courier scoring used for punitive action
- LLM-generated decisions without operational evidence links
- generic chatbot surfaces that do not tie into real operator workflows
- vanity analytics described as AI without actionability
- broad “AI agent” marketing before operator-trust controls exist

## Implementation Phases
### Phase 1: Instrumentation and command posture
Focus:
- data quality
- timestamps and event coverage
- playbook-linked command centre surfaces
- incident categorisation

### Phase 2: Assistive intelligence
Focus:
- summaries
- triage
- delay detection
- recovery suggestions
- end-of-day reporting

### Phase 3: Recommendation systems
Focus:
- driver recommendation
- anomaly scoring
- merchant readiness recommendations
- override and escalation guidance

### Phase 4: Governed assisted execution
Focus:
- one-click operator approval flows
- explicit review of AI proposals
- outcome measurement and tuning

### Phase 5: Selective automation review
Focus:
- evaluate whether any low-risk actions are mature enough for guarded automation
- keep high-risk decisions human-controlled unless policy and evidence clearly justify change

## Success Criteria For The AI Direction
ShipWright should judge AI progress by operator value, not novelty.

Signals of success:
- lower time-to-triage for blocked orders
- faster recovery from failed dispatch
- fewer missed payment or delivery risks
- less operator time spent building incident summaries manually
- clearer end-of-day operational understanding
- improved confidence in controlled demo and tester readiness

## Summary
The right evolution for ShipWright is not “AI for delivery” in the abstract.

It is:
- a logistics command centre
- with strong operational foundations
- layered assistive intelligence
- strict human review on high-risk actions
- recommendation systems built only after instrumentation and workflow discipline are real
