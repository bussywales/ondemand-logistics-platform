import { pathToFileURL } from "node:url";
import { Client, type ClientConfig } from "pg";
import {
  getOptionalEnv,
  getRequiredEnv,
  logFail,
  logPass,
  logSkip,
  normaliseBaseUrl,
  runCheck,
  type CheckResult
} from "./smoke-staging.ts";
import { loadEnvFileIfPresent } from "./env-loader.ts";
import { getGitCommit, writeProofArtifact } from "./proof-artifacts.ts";
import { runReleaseSchemaCheck } from "./release-schema-check.ts";
import { recordValidationEvidenceIfEnabled } from "./validation-evidence-recorder.ts";

function createPgConfig(connectionString: string): ClientConfig {
  const url = new URL(connectionString);
  url.searchParams.delete("sslmode");

  return {
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: false }
  };
}

type VerificationArtifact = {
  timestamp: string;
  apiBaseUrl: string;
  gitCommit: string | null;
  checks: {
    healthz: CheckResult;
    readyz: CheckResult;
    businessRestaurants: CheckResult | { skipped: true; reason: string };
    businessJobs: CheckResult | { skipped: true; reason: string };
    driverOffers: CheckResult | { skipped: true; reason: string };
    adminOverview: CheckResult | { skipped: true; reason: string };
  };
  schema:
    | {
        ok: boolean;
        items: Array<{ name: string; ok: boolean; detail: string }>;
      }
    | {
        skipped: true;
        reason: string;
      };
  externalNotifications: {
    status: "sent_recently" | "provider_unavailable" | "no_recent_signal";
    detail: string;
  };
  paidDeliveryProof: {
    available: boolean;
    command: string;
  };
};

async function checkExternalNotifications(client: Client) {
  const result = await client.query<{
    action: string;
    created_at: string;
    provider: string | null;
    reason: string | null;
  }>(
    `select action,
            created_at,
            metadata->>'provider' as provider,
            metadata->>'reason' as reason
     from public.audit_log
     where action in ('external_notification_sent', 'external_notification_skipped')
     order by created_at desc
     limit 1`
  );

  const latest = result.rows[0];
  if (!latest) {
    return {
      status: "no_recent_signal" as const,
      detail: "No external notification audit signal found."
    };
  }

  if (latest.action === "external_notification_sent") {
    return {
      status: "sent_recently" as const,
      detail: `Latest external notification sent at ${latest.created_at}${latest.provider ? ` via ${latest.provider}` : ""}.`
    };
  }

  return {
    status: "provider_unavailable" as const,
    detail: latest.reason
      ? `Latest external notification skipped at ${latest.created_at}: ${latest.reason}.`
      : `Latest external notification skipped at ${latest.created_at}.`
  };
}

function isRequiredCheckOk(result: CheckResult | { skipped: true; reason: string }) {
  return "skipped" in result ? false : result.ok;
}

async function runAuthenticatedCheck(
  label: string,
  url: string,
  token: string | null
): Promise<CheckResult | { skipped: true; reason: string }> {
  if (!token) {
    logSkip(label, `${label.replace(/^GET /, "")} token not set`);
    return { skipped: true, reason: "token_not_set" };
  }

  const result = await runCheck(label, url, {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`
    }
  });

  if (result.ok) {
    logPass(label, result);
  } else {
    logFail(label, result);
  }

  return result;
}

async function main() {
  const envLoad = loadEnvFileIfPresent("../../.env.smoke");
  const timestamp = new Date().toISOString();
  let apiBaseUrl: string;

  try {
    apiBaseUrl = normaliseBaseUrl(getRequiredEnv("SMOKE_API_BASE_URL"));
  } catch {
    const hint = envLoad.found
      ? `Loaded ${envLoad.path}, but SMOKE_API_BASE_URL is still missing.`
      : `.env.smoke was not found at ${envLoad.path}.`;
    throw new Error(
      `SMOKE_API_BASE_URL is missing.\n${hint}\nCreate .env.smoke or export it before running release verification.`
    );
  }

  const databaseUrl = getOptionalEnv("DATABASE_URL");
  const businessToken = getOptionalEnv("SMOKE_BUSINESS_BEARER_TOKEN");
  const driverToken = getOptionalEnv("SMOKE_DRIVER_BEARER_TOKEN");
  const adminToken = getOptionalEnv("SMOKE_ADMIN_BEARER_TOKEN");

  if (envLoad.found) {
    console.log(
      `INFO verify:staging | loaded ${envLoad.path}${envLoad.loadedKeys.length > 0 ? ` | keys=${envLoad.loadedKeys.join(",")}` : " | env_preloaded"}`
    );
  } else {
    console.log(`INFO verify:staging | .env.smoke not found at ${envLoad.path} | relying on exported env`);
  }

  console.log("STEP 1 | readiness | checking /healthz and /readyz");
  const healthz = await runCheck("GET /healthz", `${apiBaseUrl}/healthz`, { method: "GET" });
  const readyz = await runCheck("GET /readyz", `${apiBaseUrl}/readyz`, { method: "GET" });

  if (healthz.ok) {
    logPass("GET /healthz", healthz);
  } else {
    logFail("GET /healthz", healthz);
  }

  if (readyz.ok) {
    logPass("GET /readyz", readyz);
  } else {
    logFail("GET /readyz", readyz);
  }

  console.log("STEP 2 | schema | checking release-critical tables and customer order status support");
  const client = databaseUrl ? new Client(createPgConfig(databaseUrl)) : null;
  if (client) {
    await client.connect();
  } else {
    logSkip("schema", "DATABASE_URL not set; relying on /readyz for schema readiness");
  }

  try {
    const schema = client
      ? await runReleaseSchemaCheck(client)
      : {
          skipped: true as const,
          reason: "database_url_not_set"
        };

    if ("skipped" in schema) {
      logSkip("schema", "DATABASE_URL not set; direct schema sanity check skipped");
    } else {
      for (const item of schema.items) {
        if (item.ok) {
          console.log(`PASS schema | ${item.name} | ${item.detail}`);
        } else {
          console.error(`FAIL schema | ${item.name} | ${item.detail}`);
        }
      }
    }

    console.log("STEP 3 | smoke | optional authenticated endpoint checks");
    const businessRestaurants = await runAuthenticatedCheck(
      "GET /v1/business/restaurants",
      `${apiBaseUrl}/v1/business/restaurants`,
      businessToken
    );
    const businessJobs = await runAuthenticatedCheck(
      "GET /v1/business/jobs?page=1&limit=20",
      `${apiBaseUrl}/v1/business/jobs?page=1&limit=20`,
      businessToken
    );
    const driverOffers = await runAuthenticatedCheck(
      "GET /v1/driver/me/offers",
      `${apiBaseUrl}/v1/driver/me/offers`,
      driverToken
    );
    const adminOverview = await runAuthenticatedCheck(
      "GET /v1/admin/overview",
      `${apiBaseUrl}/v1/admin/overview`,
      adminToken
    );

    console.log("STEP 4 | notifications | checking latest external notification status");
    const externalNotifications = client
      ? await checkExternalNotifications(client)
      : {
          status: "no_recent_signal" as const,
          detail: "DATABASE_URL not set; external notification audit signal skipped."
        };
    if (!client) {
      logSkip("external notifications", externalNotifications.detail);
    } else if (externalNotifications.status === "provider_unavailable") {
      console.log(`SKIP external notifications | ${externalNotifications.detail}`);
    } else if (externalNotifications.status === "sent_recently") {
      console.log(`PASS external notifications | ${externalNotifications.detail}`);
    } else {
      console.log(`SKIP external notifications | ${externalNotifications.detail}`);
    }

    const artifact: VerificationArtifact = {
      timestamp,
      apiBaseUrl,
      gitCommit: getGitCommit(),
      checks: {
        healthz,
        readyz,
        businessRestaurants,
        businessJobs,
        driverOffers,
        adminOverview
      },
      schema,
      externalNotifications,
      paidDeliveryProof: {
        available: true,
        command: "pnpm proof:staging-paid-delivery"
      }
    };

    const proofArtifact = await writeProofArtifact("release-verify", artifact);
    console.log(`PASS proof artifact written | ${proofArtifact.filename}`);

    console.log("STEP 5 | release decision");
    const requiredPass =
      healthz.ok &&
      readyz.ok &&
      ("skipped" in schema || schema.ok) &&
      (!businessToken || (isRequiredCheckOk(businessRestaurants) && isRequiredCheckOk(businessJobs))) &&
      (!driverToken || isRequiredCheckOk(driverOffers)) &&
      (!adminToken || isRequiredCheckOk(adminOverview));

    const evidenceId = await recordValidationEvidenceIfEnabled({
      evidenceType: "RELEASE_VERIFY",
      status: requiredPass ? "PASSED" : "FAILED",
      environment: "staging",
      source: "release_verify_script",
      command: "pnpm release:verify-staging",
      summary: {
        healthzOk: healthz.ok,
        readyzOk: readyz.ok,
        schemaOk: "skipped" in schema ? null : schema.ok,
        externalNotificationsStatus: externalNotifications.status
      },
      artifactPath: `docs/proofs/${proofArtifact.filename}`
    });
    if (evidenceId) {
      console.log(`PASS validation evidence recorded | id=${evidenceId}`);
    }

    if (!requiredPass) {
      console.error("FAIL verify:staging | staging is not healthy for release");
      process.exit(1);
    }

    console.log("PASS verify:staging | staging is healthy for release");
    console.log("NEXT paid-delivery proof | pnpm proof:staging-paid-delivery");
  } finally {
    if (client) {
      await client.end();
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`FAIL verify:staging | ${error instanceof Error ? error.message : "unknown_error"}`);
    process.exit(1);
  });
}
