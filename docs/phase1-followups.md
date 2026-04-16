# Remaining Blockers Before Payments

1. Replace placeholder cancellation settlement codes with real refund, fee, and merchant/consumer liability rules.
2. Upgrade POD upload reservation into fully signed storage uploads plus post-upload object verification.
3. Replace hard-coded pricing constants with configurable rate cards and policy controls.
4. Add dead-letter, replay, and operator remediation tooling for outbox / dispatch failures.
5. Connect notification outbox events to actual delivery providers and customer/business templates.
6. Add payment authorization, capture, ledger, and payout reconciliation once delivery completion is the settlement trigger.
7. Add automated protected-endpoint smoke tests that consume the staged auth fixture harness in CI or nightly staging checks.
