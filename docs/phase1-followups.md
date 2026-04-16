# Remaining Blockers Before Production Pilot

1. Add a real consumer payment-method capture/attach flow so authorizations do not depend on raw test `paymentMethodId` inputs.
2. Upgrade Stripe webhook coverage to include disputes and chargeback placeholders without overcommitting to a full disputes engine.
3. Replace hard-coded pricing and cancellation fee constants with configurable rate cards and policy controls.
4. Connect notification outbox events to actual delivery providers and customer/business templates.
5. Add dead-letter, replay, and operator remediation tooling for payment and dispatch outbox failures.
6. Add actual payout execution and reconciliation once `payout_ledger` readiness is proven stable.
7. Add automated protected-endpoint and webhook smoke tests that use the staging auth fixture harness and Stripe test mode.
