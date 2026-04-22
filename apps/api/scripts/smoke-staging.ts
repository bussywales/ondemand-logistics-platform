import { pathToFileURL } from "node:url";

export type CheckResult = {
  ok: boolean;
  status?: number;
  requestId?: string | null;
  bodySnippet?: string;
  skipped?: boolean;
};

export function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

export function getOptionalEnv(name: string) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

export function normaliseBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        accept: "application/json",
        ...(init.headers ?? {})
      }
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function extractRequestId(response: Response) {
  return response.headers.get("x-request-id") ?? response.headers.get("request-id");
}

export async function readBodySnippet(response: Response) {
  const text = await response.text();
  return text.replace(/\s+/g, " ").trim().slice(0, 240);
}

export function logPass(name: string, result: CheckResult) {
  const parts = [`PASS ${name}`];
  if (typeof result.status === "number") {
    parts.push(`status=${result.status}`);
  }
  if (result.requestId) {
    parts.push(`request_id=${result.requestId}`);
  }
  console.log(parts.join(" | "));
}

export function logFail(name: string, result: CheckResult) {
  const parts = [`FAIL ${name}`];
  if (typeof result.status === "number") {
    parts.push(`status=${result.status}`);
  }
  if (result.requestId) {
    parts.push(`request_id=${result.requestId}`);
  }
  if (result.bodySnippet) {
    parts.push(`body=${result.bodySnippet}`);
  }
  console.error(parts.join(" | "));
}

export function logSkip(name: string, reason: string) {
  console.log(`SKIP ${name} | ${reason}`);
}

export async function runCheck(
  name: string,
  url: string,
  init: RequestInit,
  options?: { timeoutMs?: number; expectedStatus?: number }
): Promise<CheckResult> {
  const timeoutMs = options?.timeoutMs ?? 10_000;
  const expectedStatus = options?.expectedStatus ?? 200;

  try {
    const response = await fetchWithTimeout(url, init, timeoutMs);
    const requestId = extractRequestId(response);

    if (response.status !== expectedStatus) {
      return {
        ok: false,
        status: response.status,
        requestId,
        bodySnippet: await readBodySnippet(response)
      };
    }

    return {
      ok: true,
      status: response.status,
      requestId
    };
  } catch (error) {
    return {
      ok: false,
      bodySnippet: error instanceof Error ? error.message : "unknown_error"
    };
  }
}

export async function runSmokeStaging() {
  const baseUrl = normaliseBaseUrl(getRequiredEnv("SMOKE_API_BASE_URL"));
  const businessToken = getRequiredEnv("SMOKE_BUSINESS_BEARER_TOKEN");
  const driverToken = getOptionalEnv("SMOKE_DRIVER_BEARER_TOKEN");
  const adminToken = getOptionalEnv("SMOKE_ADMIN_BEARER_TOKEN");

  const results = await Promise.all([
    runCheck("GET /healthz", `${baseUrl}/healthz`, { method: "GET" }),
    runCheck("GET /readyz", `${baseUrl}/readyz`, { method: "GET" }),
    runCheck("GET /v1/business/jobs?page=1&limit=20", `${baseUrl}/v1/business/jobs?page=1&limit=20`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${businessToken}`
      }
    })
  ]);

  const [healthz, readyz, businessJobs] = results;

  for (const [name, result] of [
    ["GET /healthz", healthz],
    ["GET /readyz", readyz],
    ["GET /v1/business/jobs?page=1&limit=20", businessJobs]
  ] as const) {
    if (result.ok) {
      logPass(name, result);
    } else {
      logFail(name, result);
    }
  }

  if (!driverToken) {
    logSkip("driver smoke", "SMOKE_DRIVER_BEARER_TOKEN not set");
  }

  if (!adminToken) {
    logSkip("admin smoke", "SMOKE_ADMIN_BEARER_TOKEN not set");
  }

  if (!healthz.ok || !readyz.ok || !businessJobs.ok) {
    return false;
  }

  console.log("PASS smoke:staging | required checks passed");
  return true;
}

async function main() {
  const passed = await runSmokeStaging();
  if (!passed) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`FAIL smoke:staging | ${error instanceof Error ? error.message : "unknown_error"}`);
    process.exit(1);
  });
}
