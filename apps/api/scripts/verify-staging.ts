import {
  getOptionalEnv,
  getRequiredEnv,
  logSkip,
  logPass,
  logFail,
  normaliseBaseUrl,
  runCheck
} from "./smoke-staging.ts";

async function main() {
  const baseUrl = normaliseBaseUrl(getRequiredEnv("SMOKE_API_BASE_URL"));
  const businessToken = getRequiredEnv("SMOKE_BUSINESS_BEARER_TOKEN");
  const driverToken = getOptionalEnv("SMOKE_DRIVER_BEARER_TOKEN");
  const adminToken = getOptionalEnv("SMOKE_ADMIN_BEARER_TOKEN");

  console.log("STEP 1 | migrations | confirm staging migrations were applied before deploy");
  console.log("STEP 2 | deploy | confirm the intended staging deploy is live before verification");

  console.log("STEP 3 | readiness | checking /healthz and /readyz");
  const healthz = await runCheck("GET /healthz", `${baseUrl}/healthz`, { method: "GET" });
  const readyz = await runCheck("GET /readyz", `${baseUrl}/readyz`, { method: "GET" });

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

  console.log("STEP 4 | smoke | checking authenticated business critical path");
  const businessRestaurants = await runCheck(
    "GET /v1/business/restaurants",
    `${baseUrl}/v1/business/restaurants`,
    {
      method: "GET",
      headers: {
        authorization: `Bearer ${businessToken}`
      }
    }
  );
  const businessJobs = await runCheck(
    "GET /v1/business/jobs?page=1&limit=20",
    `${baseUrl}/v1/business/jobs?page=1&limit=20`,
    {
      method: "GET",
      headers: {
        authorization: `Bearer ${businessToken}`
      }
    }
  );

  if (businessRestaurants.ok) {
    logPass("GET /v1/business/restaurants", businessRestaurants);
  } else {
    logFail("GET /v1/business/restaurants", businessRestaurants);
  }

  if (businessJobs.ok) {
    logPass("GET /v1/business/jobs?page=1&limit=20", businessJobs);
  } else {
    logFail("GET /v1/business/jobs?page=1&limit=20", businessJobs);
  }

  let driverSmokeOk = true;
  if (!driverToken) {
    logSkip("driver smoke", "SMOKE_DRIVER_BEARER_TOKEN not set");
  } else {
    const driverOffers = await runCheck("GET /v1/driver/me/offers", `${baseUrl}/v1/driver/me/offers`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${driverToken}`
      }
    });

    if (driverOffers.ok) {
      logPass("GET /v1/driver/me/offers", driverOffers);
    } else {
      logFail("GET /v1/driver/me/offers", driverOffers);
    }
    driverSmokeOk = driverOffers.ok;
  }

  if (!adminToken) {
    logSkip("admin smoke", "SMOKE_ADMIN_BEARER_TOKEN not set");
  }

  console.log("STEP 5 | release decision");
  if (!healthz.ok || !readyz.ok || !businessRestaurants.ok || !businessJobs.ok || !driverSmokeOk) {
    console.error("FAIL verify:staging | staging is not healthy for release");
    process.exit(1);
  }

  console.log("PASS verify:staging | staging is healthy for release");
}

main().catch((error) => {
  console.error(`FAIL verify:staging | ${error instanceof Error ? error.message : "unknown_error"}`);
  process.exit(1);
});
