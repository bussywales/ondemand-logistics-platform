# Chippar homepage — selected Precision Network direction

## Scope and behaviour

This source change rebrands and redesigns only the public root route. The owner selected the dark-ink/lime screenshot on9September2026; its attached image overrides older option numbering. It is a responsive, working frontend, not a screenshot embedded as a page.

Public navigation retains existing routes: walkthrough `/demo/request`, pilot `/demo/request?interest=pilot`, login `/get-started`, pricing `/pricing`. Product and operator links scroll to actual homepage sections. Legacy destination page styling and operations/auth flows remain outside this homepage slice. Root-page metadata overrides the old brand without changing operations metadata.

The four-stage sequence is an explicit local illustration. Stage selection and the native dialog never fetch or persist orders. Pickup/delivery remain planned/pending; no completed timestamps are invented. The tour is interactive, not a video. Keyboard focus returns to the invoking button on closing. Menu, stage selection, primary actions and reduced-motion behaviour must be verified in browser acceptance.

CSS is module-scoped beneath the Chippar page. Do not move the dark palette/heading overrides into global styles. Phosphor React2.1.10 is an exactly pinned MIT-licensed icon dependency; individual exports avoid full-catalogue imports. Existing Next/React/backend versions remain unchanged.

## Image provenance

Four synthetic editorial assets were individually generated and inspected for the selected composition. They are not customer photographs or evidence of a completed delivery. Next Image serves responsive optimised variants; original PNGs are retained.

| File under `apps/web/public/brand/chippar` | Original dimensions | SHA-256                                                          |
| ------------------------------------------ | ------------------- | ---------------------------------------------------------------- |
| restaurant-bag.png                         | 1402×1122           | 7e711f12075badb868c37d7358ccbf0e504a27ed830ebe4781c0eaca56461f3a |
| dispatch-screen.png                        | 1402×1122           | 3a5d90900bf175fe548d2474ee60de0ff9ef447a6fb440d283f2b8b1b585cfb6 |
| courier-handoff.png                        | 1402×1122           | 780910623e2d044036c5b978f46c8351827592f648d6c0087c46ccccbe731b5e |
| delivery-doorstep.png                      | 1402×1122           | 0c7e03dd673c9d5d2a680ff3498b75668390e49c85172e83b213e5645bda1421 |

## Safe local review

Use a fresh isolated checkout and empty browser session. Inspect scripts before running. Start only the frontend, never the root backend/worker dev commands. A preview must explicitly set API and Supabase endpoints to an inert loopback destination, not leave API unset (the source falls back to the existing Render service). Retain no real credentials. Existing analytics code is preserved, but isolate/block its network destination for non-mutating tests.

An env-i local session was used with Node22.22.2, Next15.5.12, pnpm8.15.9, `NEXT_TELEMETRY_DISABLED=1`, both public API/Supabase URLs set to `http://127.0.0.1:9`, and a non-secret dummy anonymous-key string. None of this local synthetic configuration is a Production build configuration. Do not deploy prebuilt local artifacts or upload these environment values.

Run focused homepage tests and the full web unit suite; run the normal build/typecheck without suppressions. Root CI also defines workspace tests/build/typecheck/migration validation, which remain separate gates. Backend integration tests may connect to a database and are not covered by a no-DB frontend review.

## Baseline diagnostic distinction

The normal Next 15.5.12 frontend build passes, including its production-source type validation and 48 static pages. The existing web `typecheck` script runs that same build. No build configuration or diagnostic suppression was added.

A stricter direct `tsc --noEmit --incremental false` check still reports seven pre-existing test-fixture errors: missing `OrgSummary.status` and `AdminCommandView.dispatchAudit`. A fresh worktree of exact canonical base `e36f7779c32a9a8c5a2e019ca2f9412a86ea789a` reproduces the identical seven errors. The pinned Next compiler itself filters test-file diagnostics in its existing `runTypeCheck.js`; this is why normal build success and failed direct `tsc` coexist. Preserve both facts; do not call raw `tsc` green or silently repair fixtures outside this slice.

## Release and rollback

### Conversion analytics correction (9 September 2026)

PR #5's unresolved P2 correctly identified missing conversion-click analytics in the new homepage. The correction restores the existing `AnalyticsLink` / `CTA_CLICKED` contract to seven placements: desktop and mobile pilot/walkthrough links, hero walkthrough, footer pilot/pricing, and tour-dialog walkthrough. Metadata remains only `label` (the visible link text) and `source` (the placement). Section anchors, login, brand links and illustrative tour/stage controls are not conversion events. The existing page-view component is unchanged. No telemetry service, field, dependency or backend change is introduced.

All destinations, visible labels, icons, classes and accessible anchor semantics are preserved. `prefetch={false}` avoids adding automatic route prefetch traffic. Navigation uses the existing shared Next Link component; tests prove href forwarding and that its analytics handler does not cancel the click, not a live destination's operational acceptance.

Focused tests exercise the real shared link click handler with mocked analytics, requiring exactly one `CTA_CLICKED` per activation and exact metadata. Static rendering for both mobile-menu states is compared with equivalent plain anchors, with fetch forbidden. These are offline component/handler tests, not hydrated browser or live telemetry receipts. No live analytics or provider endpoint may be exercised during correction validation. Exact candidate and independent review evidence are recorded separately; the original release candidate must not be published while this review finding is outstanding.

Local validation: Node 22.22.2 with existing installed Vitest 3.2.4 / Next 15.5.12, no dependency installation. All 61 web test files / 243 tests pass, including ten new analytics assertions and six existing homepage/interaction assertions. The Next build/type validation passes with 48 static pages. Both final runs were wrapped in macOS `sandbox-exec` denying all network. Unit tests retain their existing mocked URL expectations; the build uses explicit inert loopback API/Supabase values. Initial SSR comparisons failed because Next Link emits `href` after `class`; the expected plain anchors were reordered without dropping any attribute/content comparison. An initial full-suite run with loopback API values failed three unrelated mocked URL assertions; the no-override, network-denied rerun passes without changing those tests. These failed attempts remain part of the evidence, not waived application failures.

Require final visual QA, exact-SHA independent review, green normal integration checks, verified target and rollback before release. Domain attachment/DNS is independent: Chippar origin is currently rejected by API CORS; Supabase callback/site URL and managed GoDaddy rollback still need reconciliation. Do not change auth/API/database/provider settings as part of the homepage release.

Rollback uses the previously verified exact frontend deployment or a normal reviewed source revert. Keep existing Vercel hostname, old assets, operational routes and backend untouched. Releasing a homepage does not certify checkout, payments, dispatch, owner/customer access, or the whole platform.
