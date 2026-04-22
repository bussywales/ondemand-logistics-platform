type CheckResult = {
  ok: boolean;
  status?: number;
  requestId?: string | null;
  bodySnippet?: string;
  skipped?: boolean;
};

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function getOptionalEnv(name: string) {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

function normaliseBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
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

function extractRequestId(response: Response) {
  return response.headers.get("x-request-id") ?? response.headers.get("request-id");
}

async function readBodySnippet(response: Response) {
  const text = await response.text();
  return text.replace(/\s+/g, " ").trim().slice(0, 240);
}

function logPass(name: string, result: CheckResult) {
  const parts = [`PASS ${name}`];
  if (typeof result.status === "number") {
    parts.push(`status=${result.status}`);
  }
  if (result.requestId) {
    parts.push(`request_id=${result.requestId}`);
  }
  console.log(parts.join(" | "));
}

function logFail(name: string, result: CheckResult) {
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

function logSkip(name: string, reason: string) {
  console.log(`SKIP ${name} | ${reason}`);
}

async function runCheck(
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

async function main() {
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
    process.exitCode = 1;
    return;
  }

  console.log("PASS smoke:staging | required checks passed");
}

main().catch((error) => {
  console.error(`FAIL smoke:staging | ${error instanceof Error ? error.message : "unknown_error"}`);
  process.exit(1);
});
