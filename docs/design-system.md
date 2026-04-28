# ShipWright Design System v1

## Purpose
ShipWright Design System v1 turns the current premium logistics command-centre direction into a repeatable implementation system. It exists to keep future UI work consistent, semantic, and operationally useful instead of drifting into generic SaaS dashboard patterns.

The system is implemented in `apps/web/app/design-system.css` and should be used before creating new one-off visual classes.

## Design Posture
ShipWright should feel like a premium logistics operating product: calm, high-contrast, structured, live, and decision-oriented. Screens should help an operator understand what is happening, why it matters, and what action to take next.

## Token System
### Colours
Use CSS custom properties from `apps/web/app/design-system.css`:

| Token | Purpose |
| --- | --- |
| `--sw-color-background` | App workspace background |
| `--sw-color-surface` | Standard panel/card surface |
| `--sw-color-surface-elevated` | Lifted operational panels |
| `--sw-color-navy-950` through `--sw-color-navy-100` | Command-centre navy scale |
| `--sw-color-text-primary` | Primary text |
| `--sw-color-text-muted` | Secondary labels/help text |
| `--sw-color-text-inverse` | Text on dark command surfaces |
| `--sw-color-success` | Completed/healthy/ready |
| `--sw-color-warning` | Risk/delay |
| `--sw-color-danger` | Blocker/failure/destructive |
| `--sw-color-info` | Active/in-progress/system info |
| `--sw-color-*-soft` | Semantic tinted backgrounds |

### Gradients
| Token | Use |
| --- | --- |
| `--sw-gradient-danger-command` | Blocker/failure decision surfaces |
| `--sw-gradient-warning-command` | Risk/review command surfaces |
| `--sw-gradient-neutral-command` | Healthy/normal command summaries |

### Elevation
| Token | Use |
| --- | --- |
| `--sw-shadow-sm` | Supporting rows and empty states |
| `--sw-shadow-md` | Operational cards and command summaries |
| `--sw-shadow-lg` | Primary decision surfaces |
| `--sw-shadow-danger-glow` | Urgent/blocker glow only |

### Radius
| Token | Use |
| --- | --- |
| `--sw-radius-sm` | Buttons and compact controls |
| `--sw-radius-md` | Inputs and icon containers |
| `--sw-radius-lg` | Cards, rows, panels |
| `--sw-radius-xl` | Decision and command surfaces |

### Spacing
Use the 4px-based scale:

| Token | Size |
| --- | --- |
| `--sw-space-1` | 4px |
| `--sw-space-2` | 8px |
| `--sw-space-3` | 12px |
| `--sw-space-4` | 16px |
| `--sw-space-6` | 24px |
| `--sw-space-8` | 32px |
| `--sw-space-12` | 48px |

### Typography
| Token | Use |
| --- | --- |
| `--sw-type-hero` | Primary decision title |
| `--sw-type-page-title` | Page title |
| `--sw-type-section-title` | Section heading |
| `--sw-type-card-title` | Card/row title |
| `--sw-type-body` | Body text |
| `--sw-type-label` | Eyebrows, labels, badges |
| `--sw-type-value` | Key operational values |

Use `.sw-tabular` for numbers that should align visually.

## Hierarchy Levels
### `.sw-decision-surface`
Highest priority. Use only for pages or sections where an operator must make or understand a critical decision. Every blocker surface must include diagnosis, impact, and next action.

### `.sw-command-surface`
Summarises the current system state. Use for dashboard command strips and workspace posture summaries.

### `.sw-operational-surface`
Holds operational context such as route, driver, payment, or active work queues.

### `.sw-supporting-surface`
Holds secondary data such as attempts, timeline, logs, or history.

### `.sw-utility-surface`
Holds low-priority controls, advanced actions, and maintenance tools.

## Component Classes
### Decision Surface
Use these together:

```html
<section class="sw-decision-surface">
  <div class="sw-decision-header">
    <h2 class="sw-decision-title">Dispatch failed</h2>
    <p class="sw-decision-copy">The job needs operator action.</p>
  </div>
  <div class="sw-decision-insight-grid">
    <article class="sw-decision-insight">...</article>
  </div>
  <div class="sw-decision-actions">...</div>
</section>
```

### Metric Card
Use for live system signals, not generic dashboard stats:

```html
<article class="sw-metric-card">
  <span class="sw-metric-icon sw-icon-badge sw-icon-badge--info">...</span>
  <span class="sw-metric-label">Active jobs</span>
  <strong class="sw-metric-value sw-tabular">12</strong>
  <p class="sw-metric-copy">Requested, assigned, or moving.</p>
</article>
```

### Queue Row
Use for operational rows requiring scan and action:

```html
<article class="sw-queue-row sw-queue-row--danger">
  <div class="sw-queue-row-main">...</div>
  <div class="sw-queue-row-actions">...</div>
</article>
```

### Badge
Use semantic badges only:

- `.sw-badge--danger`
- `.sw-badge--warning`
- `.sw-badge--success`
- `.sw-badge--info`
- `.sw-badge--neutral`

### Button
Use one primary action per surface where possible:

- `.sw-button--primary`
- `.sw-button--secondary`
- `.sw-button--danger`
- `.sw-button--ghost`

### Icon Badge
Icons must be paired with text unless the control has an accessible label:

- `.sw-icon-badge--danger`
- `.sw-icon-badge--warning`
- `.sw-icon-badge--success`
- `.sw-icon-badge--info`
- `.sw-icon-badge--neutral`

### Forms
Use these for future form refactors:

- `.sw-field`
- `.sw-input`
- `.sw-label`
- `.sw-help-text`
- `.sw-error-text`

### Empty State
Use empty states to instruct the operator/customer:

- `.sw-empty-state`
- `.sw-empty-title`
- `.sw-empty-copy`

## Semantic Rules
- Red/danger only means blocker, failure, destructive action, or urgent attention.
- Amber/warning only means risk or delay.
- Blue/info only means active, in-progress, or system information.
- Green/success only means completed, healthy, or ready.
- Icons must support meaning, not decorate randomly.
- Icons must not be the only source of meaning.
- Every blocker must show diagnosis, impact, and next action.
- Do not create equal-weight card grids for operational pages.
- Decision-first hierarchy must be preserved.
- Avoid raw backend labels/messages in user-facing UI.

## Anti-Patterns
- A dashboard grid where every card has equal weight.
- Red used for decoration or branding.
- Icon-only status without readable text.
- Dense operational tables without diagnosis/action.
- Multiple primary buttons in one section.
- Decorative gradients that do not express hierarchy or state.
- Exposed technical state when an operator-facing explanation is available.

## Correct Usage Examples
### Blocked Job
Use `.sw-decision-surface`, danger badges, diagnosis/impact/action tiles, and one primary recovery action.

### Dashboard Summary
Use `.sw-command-surface` for the workspace state, followed by `.sw-metric-card` signals and queue rows.

### Timeline or Dispatch Attempts
Use `.sw-supporting-surface`; do not make history visually compete with current decision state.

### Operator Controls
Use `.sw-utility-surface`; keep advanced controls visibly available but lower priority.

## Design QA Checklist
Before accepting UI:

1. Can the operator tell what is happening in 3 seconds?
2. Is there a clear next action?
3. Are colours semantic, not decorative?
4. Is there one clear primary surface?
5. Does this feel like an operations system, not an admin dashboard?

## Implementation Guidance
- Start with hierarchy: choose decision, command, operational, supporting, or utility surface before styling details.
- Use the `sw-*` classes first; add route-specific classes only when layout or data shape requires it.
- Prefer existing `ShipWrightIcon` icons and semantic icon badge classes.
- If a new class is needed, it should compose with the system rather than bypass it.
- Future UI work should reference this document and `apps/web/app/design-system.css` before implementation.
