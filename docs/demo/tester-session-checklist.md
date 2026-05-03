# Tester Session Checklist

## Before Session
- confirm attendee list and session owner
- confirm seeded accounts are available:
  - business operator
  - driver
  - platform admin if needed
- run:

```bash
pnpm release:verify-staging
pnpm proof:staging-paid-delivery
```

- confirm latest proof artifacts exist under `docs/proofs/`
- confirm pilot restaurant route loads:
  - `/restaurants/pilot-kitchen-1777370757`
- confirm the latest proven tracking url is available from the latest proof artifact
- open the fallback references:
  - `docs/demo/known-limitations.md`
  - `docs/playbooks/README.md`

## During Session
- keep one person driving the session
- keep one person capturing notes
- record every issue with:
  - time observed
  - route
  - actor role
  - order id / job id / payment id if available
  - expected behavior
  - actual behavior
- if a blocker appears:
  - stop overstating the product state
  - switch to the latest proof artifact or playbook
  - record whether the issue is cosmetic, usability, or flow-blocking

## After Session
- collect all notes into one issue summary
- classify findings:
  - critical blocker
  - operator friction
  - customer friction
  - cosmetic only
  - environment/setup issue
- attach screenshots and ids
- identify whether the issue was:
  - live route bug
  - stale session/auth issue
  - staging env issue
  - unsupported flow outside the controlled session scope
- confirm whether another proof run is needed before the next tester session

## Feedback Capture Template
- session date:
- facilitator:
- note taker:
- attendee names:
- scenario tested:
- routes covered:
- proof artifact referenced:
- overall outcome:
- highest-severity issue:
- follow-up owner:
- next session date:

## Issues To Log
Always log:
- checkout failures
- order created but not visible in orders
- tracking route mismatch or stale progression
- notification visibility problems
- driver progression failures
- admin visibility gaps
- auth/session expiry issues
- major UI confusion during the core happy path

## Screenshots And Evidence To Collect
Minimum capture set when issues occur:
- current route screenshot
- relevant order/job/payment ids
- timestamp
- current user role
- console/network evidence if relevant
- latest proof artifact path used for comparison

Recommended success evidence:
- public order success state
- tracking state
- business order queue row
- payment risk row if present
- driver delivery progression state
- admin control plane summary
