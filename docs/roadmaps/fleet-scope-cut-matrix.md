# Fleet Scope Cut Matrix

This matrix defines what must be built now, what should be bought now, what can remain manual at pilot, and what is explicitly deferred.

| Capability | Decision | Stage | Rationale | Notes |
| --- | --- | --- | --- | --- |
| Restaurant onboarding | Build now | Stage 1 | Pilot cannot run without merchant activation. | Keep it sales-led and operationally simple. |
| Menu setup | Build now | Stage 1 | Merchants need an orderable catalogue to trade live orders. | Manual data entry is acceptable behind the scenes if needed. |
| Branded ordering page | Build now | Stage 1 | Pilot needs a customer-facing order surface owned by the restaurant relationship. | Do not overbuild design variants for pilot. |
| Checkout and payment | Buy now plus integrate | Stage 1 | Payment infrastructure is not a differentiator at pilot stage. | Use provider-backed payment rails; keep internal money state authoritative. |
| Order creation and lifecycle | Build now | Stage 1 | Core product capability. | Must be reliable before launch. |
| Courier offer and accept | Build now | Stage 1 | Required for live delivery completion. | Keep early dispatch rules simple and explicit. |
| Pickup and delivery completion | Build now | Stage 1 | Pilot value is proven only when deliveries complete end-to-end. | Proof standards can be minimal but credible. |
| Customer order status visibility | Build now | Stage 1 | Customers need basic confidence and support visibility. | Keep the status model simple. |
| Restaurant order visibility | Build now | Stage 1 | Merchants need to see and manage live orders. | Focus on practical visibility, not deep analytics. |
| Courier onboarding compliance minimum | Build now | Stage 1 | Legal and operational risk cannot be ignored for pilot. | Minimum credible checks only. |
| Support and dispute handling | Manual now | Stage 1 | Pilot volume does not justify full workflow automation. | Use manual ops playbooks. |
| Payout and reconciliation workflows | Manual now | Stage 1 | Necessary, but can remain founder or operator-led in pilot. | Maintain ledger visibility even if workflow remains manual. |
| Admin tooling polish | Manual now | Stage 1 | Internal users can tolerate rough edges early. | Avoid building internal tools that do not change pilot outcomes. |
| Advanced analytics | Deferred | Stage 3 | Insight depth is not the bottleneck before live pilot proof. | Capture the data needed later; do not build the reporting layer now. |
| Referral tooling | Deferred | Stage 3 | Not required to prove initial delivery economics. | Revisit after repeatable merchant activation exists. |
| Rich courier earnings tooling | Deferred | Stage 3 | Not required for controlled pilot. | Basic payout visibility is enough earlier. |
| Dispatch automation hardening | Build next | Stage 2 | Operational launch depends on lower manual intervention. | Improve automation only after pilot path works. |
| Proof of delivery robustness | Build next | Stage 2 | Operational credibility depends on verifiable completion. | Pilot can use a thinner version. |
| Exception handling and support tooling | Build next | Stage 2 | Needed to reduce founder dependence. | Tie to actual observed failure modes. |
| Monitoring and alerts | Buy/build minimum | Stage 2 | Operators need earlier visibility into failures. | Add only what supports live recovery. |
| Subscription billing automation | Deferred | Stage 3 | Commercially useful, but not a pilot gate. | Keep out of the critical path. |
| Self-serve merchant onboarding | Deferred | Stage 3 | Sales-led onboarding is sufficient earlier. | Revisit when activation volume justifies it. |
| Operational efficiency tooling | Deferred until proven need | Stage 3 | Efficiency work should follow observed pain, not speculation. | Use real operating data to prioritise. |
