# Fleet Pilot Readiness Checklist

This checklist defines the minimum credible gate for starting a controlled pilot. It is not a scale wishlist.

## Product
- [ ] at least one pilot restaurant can be onboarded fully
- [ ] menu data is loaded and orderable
- [ ] branded ordering page is live for the pilot restaurant
- [ ] checkout and payment complete successfully for a pilot order
- [ ] an order can be created and routed into dispatch
- [ ] a courier can receive, accept, and complete a delivery
- [ ] restaurant staff can see live order state clearly enough to operate
- [ ] customers can see basic order status clearly enough to avoid unnecessary support contact

## Compliance
- [ ] minimum courier onboarding and identity checks are defined and applied
- [ ] terms, liability, and operating responsibilities are clear enough for pilot use
- [ ] payment handling and payout handling are understood operationally, even if partially manual
- [ ] there is a named owner for incident, support, and escalation decisions during pilot

## Operations
- [ ] dispatch path works in the pilot geography
- [ ] fallback manual dispatch procedure exists if automation fails
- [ ] support escalation path exists for failed, delayed, or disputed orders
- [ ] proof of delivery standard is defined for pilot operations
- [ ] operators can see enough order state to intervene when needed
- [ ] basic readiness and smoke verification are part of every staging release before pilot traffic relies on it

## Commercial
- [ ] at least one restaurant has agreed to pilot on the defined operating terms
- [ ] pilot geography and service window are explicitly constrained
- [ ] pricing approach is agreed for the pilot period
- [ ] the business knows what counts as pilot success, extension, or shutdown

## Technical readiness
- [ ] staging verification sequence is documented and repeatable
- [ ] required migrations can be applied consistently before release
- [ ] `/healthz` passes
- [ ] `/readyz` passes
- [ ] authenticated critical-path smoke passes
- [ ] operator team knows where to look when auth restore, dispatch, or payment flows fail

## Not required for pilot
The following are useful, but not pilot gates:
- subscription billing automation
- advanced analytics and reporting
- referral tooling
- polished admin surfaces
- full payout automation
- full dispute automation
- rich courier earnings tooling

## Pilot success criteria
Use these measures to judge whether the pilot is working, not just whether the software shipped.

- [ ] first successful end-to-end live order completed
- [ ] successful completion rate is at least 90% across the first 25 pilot orders
- [ ] median dispatch acceptance time is 5 minutes or less during the controlled pilot window
- [ ] failed order rate remains below 10% across the first 25 pilot orders
- [ ] at least one pilot restaurant is willing to continue after the initial test period
- [ ] the operation can run for a sustained pilot window without constant manual intervention on every order
