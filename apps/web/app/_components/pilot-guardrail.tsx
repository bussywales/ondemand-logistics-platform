import React from "react";
import Link from "next/link";
import { ShipWrightIcon } from "./shipwright-icon";
import { getPilotGuardrailState, pilotGuardrailBadgeClass, type PilotGuardrailState } from "../_lib/pilot-guardrails";
import type { BusinessPilotStatus } from "../_lib/product-state";

function surfaceClass(state: PilotGuardrailState) {
  if (state.guardrailLevel === "PAUSED") return "pilot-guardrail pilot-guardrail-paused";
  if (state.guardrailLevel === "WARNING") return "pilot-guardrail pilot-guardrail-warning";
  if (state.guardrailLevel === "READY") return "pilot-guardrail pilot-guardrail-ready";
  return "pilot-guardrail";
}

export function PilotGuardrailBanner(props: {
  canManagePilots?: boolean;
  compact?: boolean;
  pilotStatus: BusinessPilotStatus | null;
}) {
  const state = getPilotGuardrailState(props.pilotStatus, { canManagePilots: props.canManagePilots });

  return (
    <section className={`${surfaceClass(state)} ${props.compact ? "pilot-guardrail-compact" : ""}`} aria-label="Pilot workspace guardrail">
      <div className="pilot-guardrail-copy">
        <span className="sw-icon-badge sw-icon-badge--info pilot-guardrail-icon" aria-hidden="true">
          <ShipWrightIcon name={state.guardrailLevel === "READY" ? "check" : state.guardrailLevel === "PAUSED" || state.guardrailLevel === "WARNING" ? "warning" : "queue"} />
        </span>
        <div>
          <div className="briefing-evidence-row">
            <span className={`sw-badge ${pilotGuardrailBadgeClass(state.guardrailLevel)}`}>{state.badgeCopy}</span>
            <span>{state.checklistCopy}</span>
          </div>
          <h2>{state.title}</h2>
          <p>{state.message}</p>
          <p className="ops-detail-note">{state.recommendedAction}</p>
        </div>
      </div>
      <div className="pilot-guardrail-actions">
        {state.adminHref ? (
          <Link className="sw-button sw-button--secondary button button-secondary" href={state.adminHref}>
            <ShipWrightIcon name="arrow" />
            <span>Review pilot profile</span>
          </Link>
        ) : null}
        <Link className="sw-button sw-button--secondary button button-secondary" href={state.helpHref}>
          <ShipWrightIcon name="document" />
          <span>Pilot operations help</span>
        </Link>
      </div>
    </section>
  );
}
