import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { AdminShell } from "../_components/admin-shell";
import type { AdminProofSummary } from "../_lib/admin-state";

async function loadLatestProofSummary(): Promise<AdminProofSummary | null> {
  const proofsDir = path.join(process.cwd(), "docs", "proofs");

  try {
    const files = (await readdir(proofsDir))
      .filter((name) => /^release-verify-.*\.json$/i.test(name))
      .sort((left, right) => right.localeCompare(left));
    const fileName = files[0];

    if (!fileName) {
      return null;
    }

    const raw = await readFile(path.join(proofsDir, fileName), "utf8");
    const parsed = JSON.parse(raw) as {
      timestamp?: string;
      apiBaseUrl?: string;
      checks?: {
        healthz?: { ok?: boolean };
        readyz?: { ok?: boolean };
      };
      schema?: { ok?: boolean } | { skipped?: true };
      externalNotifications?: {
        status?: "sent_recently" | "provider_unavailable" | "no_recent_signal";
      };
    };
    const schemaOk = parsed.schema && "ok" in parsed.schema ? parsed.schema.ok ?? null : null;

    return {
      fileName,
      timestamp: parsed.timestamp ?? fileName.replace(/^release-verify-/, "").replace(/\.json$/i, ""),
      apiBaseUrl: parsed.apiBaseUrl ?? null,
      healthzOk: parsed.checks?.healthz?.ok ?? null,
      readyzOk: parsed.checks?.readyz?.ok ?? null,
      schemaOk,
      externalNotificationsStatus: parsed.externalNotifications?.status ?? null
    };
  } catch {
    return null;
  }
}

export default async function AdminPage() {
  const latestProof = await loadLatestProofSummary();

  return <AdminShell latestProof={latestProof} />;
}
