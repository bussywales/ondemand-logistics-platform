import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { Client, type ClientConfig, type PoolClient } from "pg";
import { createLogger } from "@shipwright/observability";
import { dispatchSideEffect } from "../../worker/src/index.ts";

type FixtureSlug = "business" | "driver" | "consumer";

type FixtureSpec = {
  slug: FixtureSlug;
  email: string;
  password: string;
  displayName: string;
};

type FixtureAuth = {
  userId: string;
  accessToken: string;
};

type PublicMenu = {
  restaurant: { id: string; name: string; slug: string; status: string };
  categories: Array<{
    id: string;
    name: string;
    items: Array<{ id: string; name: string; priceCents: number; currency: string }>;
  }>;
};

type CustomerOrderResponse = {
  order: { id: string; jobId: string; paymentId: string; status: string; totalCents: number; currency: string };
  job: { id: string; status: string };
  payment: { id: string; status: string };
};

type DriverOffer = {
  offerId: string;
  jobId: string;
  status: string;
};

type DriverJob = {
  id: string;
  status: string;
};

type OutboxMessage = {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  retry_count: number;
};

const ORG_ID = "70d56b02-f2b8-487a-8c97-8e30fd9e631f";
const DRIVER_ID = "8a5d2d96-4f0a-4711-b8b0-7ed9478d41a7";
const DRIVER_LATITUDE = 51.5254;
const DRIVER_LONGITUDE = -0.1099;

const FIXTURES: FixtureSpec[] = [
  {
    slug: "business",
    email: "staging-business-operator@shipwright.local",
    password: "ShipwrightBusiness!2026",
    displayName: "Staging Business Operator"
  },
  {
    slug: "driver",
    email: "staging-driver@shipwright.local",
    password: "ShipwrightDriver!2026",
    displayName: "Staging Driver"
  },
  {
    slug: "consumer",
    email: "staging-consumer@shipwright.local",
    password: "ShipwrightConsumer!2026",
    displayName: "Staging Consumer"
  }
];

const logger = createLogger({ name: "staging-paid-delivery-proof" });

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function optionalEnv(name: string, fallback: string) {
  return process.env[name]?.trim() || fallback;
}

function createPgConfig(connectionString: string): ClientConfig {
  const url = new URL(connectionString);
  url.searchParams.delete("sslmode");

  return {
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: false }
  };
}

function normaliseBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

async function readJson(response: Response) {
  const text = await response.text();
  return text.length === 0 ? null : (JSON.parse(text) as unknown);
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(`request_failed:${response.status}:${url}:${JSON.stringify(payload).slice(0, 500)}`);
  }

  return payload as T;
}

async function signUpOrReuseUser(supabaseUrl: string, anonKey: string, fixture: FixtureSpec): Promise<FixtureAuth> {
  const signupResponse = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${anonKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      email: fixture.email,
      password: fixture.password,
      data: {
        display_name: fixture.displayName,
        fixture_slug: fixture.slug
      }
    })
  });

  if (!signupResponse.ok) {
    const payload = await readJson(signupResponse);
    const detail = JSON.stringify(payload);
    if (!/already registered|user_already_exists/i.test(detail)) {
      throw new Error(`signup_failed:${fixture.slug}:${signupResponse.status}:${detail}`);
    }
  }

  const tokenResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${anonKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      email: fixture.email,
      password: fixture.password
    })
  });

  const tokenPayload = (await readJson(tokenResponse)) as Record<string, unknown> | null;
  if (!tokenResponse.ok) {
    throw new Error(`password_grant_failed:${fixture.slug}:${tokenResponse.status}:${JSON.stringify(tokenPayload)}`);
  }

  const user = tokenPayload?.user as { id?: string } | undefined;
  const accessToken = tokenPayload?.access_token;
  if (!user?.id || typeof accessToken !== "string") {
    throw new Error(`fixture_token_payload_invalid:${fixture.slug}`);
  }

  return {
    userId: user.id,
    accessToken
  };
}

async function seedDriverFixture(client: Client, fixtures: Record<FixtureSlug, FixtureAuth>) {
  await client.query("begin");
  try {
    await client.query(
      `insert into public.users (id, email, display_name)
       values ($1, $2, $3), ($4, $5, $6), ($7, $8, $9)
       on conflict (id) do update
       set email = excluded.email,
           display_name = excluded.display_name`,
      [
        fixtures.business.userId,
        FIXTURES[0].email,
        FIXTURES[0].displayName,
        fixtures.driver.userId,
        FIXTURES[1].email,
        FIXTURES[1].displayName,
        fixtures.consumer.userId,
        FIXTURES[2].email,
        FIXTURES[2].displayName
      ]
    );

    await client.query(
      `insert into public.orgs (id, name, created_by)
       values ($1, 'Staging Demo Business', $2)
       on conflict (id) do update
       set name = excluded.name,
           created_by = excluded.created_by`,
      [ORG_ID, fixtures.business.userId]
    );

    await client.query(
      `insert into public.org_memberships (org_id, user_id, role, is_active)
       values ($1, $2, 'BUSINESS_OPERATOR', true)
       on conflict (org_id, user_id) do update
       set role = excluded.role,
           is_active = excluded.is_active`,
      [ORG_ID, fixtures.business.userId]
    );

    await client.query(
      `insert into public.drivers (
         id,
         user_id,
         home_org_id,
         is_active,
         availability_status,
         latest_latitude,
         latest_longitude,
         last_location_at,
         active_job_id
       ) values ($1, $2, $3, true, 'ONLINE', $4, $5, now(), null)
       on conflict (id) do update
       set user_id = excluded.user_id,
           home_org_id = excluded.home_org_id,
           is_active = true,
           availability_status = 'ONLINE',
           latest_latitude = excluded.latest_latitude,
           latest_longitude = excluded.latest_longitude,
           last_location_at = now(),
           active_job_id = null`,
      [DRIVER_ID, fixtures.driver.userId, ORG_ID, DRIVER_LATITUDE, DRIVER_LONGITUDE]
    );

    await client.query(
      `delete from public.driver_vehicle
       where driver_id = $1
         and not (vehicle_type = 'BIKE' and coalesce(plate_number, '') = 'STAGING-BIKE' and is_primary = true)`,
      [DRIVER_ID]
    );

    await client.query(
      `insert into public.driver_vehicle (driver_id, vehicle_type, plate_number, is_primary)
       select $1, 'BIKE', 'STAGING-BIKE', true
       where not exists (
         select 1
         from public.driver_vehicle
         where driver_id = $1
           and vehicle_type = 'BIKE'
           and plate_number = 'STAGING-BIKE'
           and is_primary = true
       )`,
      [DRIVER_ID]
    );

    await client.query(
      `insert into public.driver_verifications (driver_id, status, document_type, document_url, reviewed_by, review_notes)
       select $1, 'APPROVED', 'license', 'https://example.com/staging-license.pdf', $2, 'staging fixture approved'
       where not exists (
         select 1
         from public.driver_verifications
         where driver_id = $1
           and status = 'APPROVED'
       )`,
      [DRIVER_ID, fixtures.business.userId]
    );

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function processScopedOutbox(client: Client, ids: string[]) {
  await client.query("begin");
  try {
    const result = await client.query<OutboxMessage>(
      `select id, aggregate_type, aggregate_id, event_type, payload, retry_count
       from public.outbox_messages
       where processed_at is null
         and next_attempt_at <= now()
         and (
           aggregate_id = any($1::uuid[])
           or payload->>'jobId' = any($1::text[])
           or payload->>'paymentId' = any($1::text[])
         )
       order by created_at
       limit 20
       for update skip locked`,
      [ids]
    );

    for (const message of result.rows) {
      await dispatchSideEffect(client as unknown as PoolClient, message, logger);
      await client.query(
        `update public.outbox_messages
         set processed_at = now(), retry_count = retry_count + 1, last_error = null
         where id = $1`,
        [message.id]
      );
      console.log(`PASS outbox processed | ${message.event_type} | ${message.id}`);
    }

    await client.query("commit");
    return result.rows.length;
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function maybeProcessOutbox(client: Client, ids: string[]) {
  if (process.env.STAGING_PROOF_PROCESS_OUTBOX !== "true") {
    return 0;
  }

  return processScopedOutbox(client, ids);
}

async function poll<T>(label: string, input: { attempts?: number; delayMs?: number; run: () => Promise<T | null> }) {
  const attempts = input.attempts ?? 20;
  const delayMs = input.delayMs ?? 1500;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const value = await input.run();
    if (value) {
      return value;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error(`poll_timeout:${label}`);
}

async function verifyRecords(client: Client, input: { orderId: string; jobId: string; paymentId: string }) {
  const order = await client.query(
    `select id, status, job_id, payment_id from public.customer_orders where id = $1`,
    [input.orderId]
  );
  const orderItems = await client.query(`select count(*)::int as count from public.customer_order_items where order_id = $1`, [input.orderId]);
  const job = await client.query(`select id, status, assigned_driver_id from public.jobs where id = $1`, [input.jobId]);
  const payment = await client.query(
    `select id, status, provider_payment_intent_id, amount_authorized_cents, amount_captured_cents from public.payments where id = $1`,
    [input.paymentId]
  );
  const pod = await client.query(`select id from public.proof_of_delivery where job_id = $1`, [input.jobId]);
  const events = await client.query(`select count(*)::int as count from public.job_events where job_id = $1`, [input.jobId]);
  const audit = await client.query(`select count(*)::int as count from public.audit_log where entity_id = $1 or metadata->>'jobId' = $1`, [input.jobId]);
  const outbox = await client.query(
    `select event_type, count(*)::int as count,
            count(processed_at)::int as processed_count,
            count(*) filter (where last_error is not null)::int as failed_count
     from public.outbox_messages
     where aggregate_id in ($1, $2)
        or payload->>'jobId' = $1
        or payload->>'paymentId' = $2
     group by event_type
     order by event_type`,
    [input.jobId, input.paymentId]
  );

  return {
    order: order.rows[0],
    customerOrderItemsCount: orderItems.rows[0]?.count ?? 0,
    job: job.rows[0],
    payment: payment.rows[0],
    pod: pod.rows[0] ?? null,
    jobEventsCount: events.rows[0]?.count ?? 0,
    auditLogCount: audit.rows[0]?.count ?? 0,
    outbox: outbox.rows
  };
}

export async function runPaidDeliveryProof() {
  const apiBaseUrl = normaliseBaseUrl(optionalEnv("STAGING_PROOF_API_BASE_URL", "https://api-staging-qvmv.onrender.com"));
  const restaurantSlug = optionalEnv("STAGING_PROOF_RESTAURANT_SLUG", "pilot-kitchen-1777370757");
  const paymentMethodId = optionalEnv("STAGING_PROOF_PAYMENT_METHOD_ID", "pm_card_visa");
  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const anonKey = requiredEnv("SUPABASE_ANON_KEY");
  const databaseUrl = requiredEnv("DATABASE_URL");
  const runId = randomUUID().slice(0, 8);

  const client = new Client(createPgConfig(databaseUrl));
  await client.connect();

  try {
    const fixtures = Object.fromEntries(
      await Promise.all(FIXTURES.map(async (fixture) => [fixture.slug, await signUpOrReuseUser(supabaseUrl, anonKey, fixture)]))
    ) as Record<FixtureSlug, FixtureAuth>;

    await seedDriverFixture(client, fixtures);
    console.log(`PASS fixture ready | org=${ORG_ID} | driver=${DRIVER_ID} | driver_user=${fixtures.driver.userId}`);

    const menu = await fetchJson<PublicMenu>(`${apiBaseUrl}/v1/restaurants/${encodeURIComponent(restaurantSlug)}/menu`);
    const firstItem = menu.categories.flatMap((category) => category.items)[0];
    if (!firstItem) {
      throw new Error(`restaurant_menu_empty:${restaurantSlug}`);
    }

    const orderPayload = {
      customer: {
        name: `Proof Customer ${runId}`,
        email: `proof-customer-${runId}@shipwright.local`,
        phone: "07500000000"
      },
      delivery: {
        address: `10 Proof Street, London ${runId}`,
        notes: "Staging paid delivery proof"
      },
      items: [{ menuItemId: firstItem.id, quantity: 1 }],
      paymentMethodId
    };
    const orderIdempotencyKey = `proof-order-${runId}`;
    const order = await fetchJson<CustomerOrderResponse>(`${apiBaseUrl}/v1/restaurants/${encodeURIComponent(restaurantSlug)}/orders`, {
      method: "POST",
      headers: {
        "Idempotency-Key": orderIdempotencyKey
      },
      body: JSON.stringify(orderPayload)
    });
    const orderReplay = await fetchJson<CustomerOrderResponse>(`${apiBaseUrl}/v1/restaurants/${encodeURIComponent(restaurantSlug)}/orders`, {
      method: "POST",
      headers: {
        "Idempotency-Key": orderIdempotencyKey
      },
      body: JSON.stringify(orderPayload)
    });
    if (
      orderReplay.order.id !== order.order.id ||
      orderReplay.order.jobId !== order.order.jobId ||
      orderReplay.order.paymentId !== order.order.paymentId
    ) {
      throw new Error(
        `idempotency_replay_created_new_records:${JSON.stringify({
          first: { orderId: order.order.id, jobId: order.order.jobId, paymentId: order.order.paymentId },
          replay: { orderId: orderReplay.order.id, jobId: orderReplay.order.jobId, paymentId: orderReplay.order.paymentId }
        })}`
      );
    }

    const ids = [order.order.jobId, order.order.paymentId];
    console.log(`PASS order submitted | order=${order.order.id} | job=${order.order.jobId} | payment=${order.order.paymentId} | status=${order.order.status}`);
    console.log(`PASS order idempotency replay | order=${orderReplay.order.id} | key=${orderIdempotencyKey}`);

    await maybeProcessOutbox(client, ids);

    const offer = await poll<DriverOffer>("driver_offer", {
      run: async () => {
        await maybeProcessOutbox(client, ids);
        const offers = await fetchJson<DriverOffer[]>(`${apiBaseUrl}/v1/driver/me/offers`, {
          headers: { authorization: `Bearer ${fixtures.driver.accessToken}` }
        });
        return offers.find((item) => item.jobId === order.order.jobId) ?? null;
      }
    });
    console.log(`PASS offer visible | offer=${offer.offerId} | driver=${DRIVER_ID}`);

    await fetchJson(`${apiBaseUrl}/v1/driver/me/offers/${offer.offerId}/accept`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${fixtures.driver.accessToken}`,
        "Idempotency-Key": `proof-offer-accept-${runId}`
      }
    });
    console.log(`PASS offer accepted | offer=${offer.offerId}`);

    const transitions = ["en-route-pickup", "picked-up", "en-route-drop"] as const;
    let currentJob: DriverJob | null = null;
    for (const transition of transitions) {
      currentJob = await fetchJson<DriverJob>(`${apiBaseUrl}/v1/driver/me/jobs/${order.order.jobId}/${transition}`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${fixtures.driver.accessToken}`,
          "Idempotency-Key": `proof-${transition}-${runId}`
        }
      });
      console.log(`PASS driver transition | ${transition} | status=${currentJob.status}`);
    }

    const pod = await fetchJson<{ id: string }>(`${apiBaseUrl}/v1/driver/me/jobs/${order.order.jobId}/proof-of-delivery`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${fixtures.driver.accessToken}`,
        "Idempotency-Key": `proof-pod-${runId}`
      },
      body: JSON.stringify({
        photoUrl: null,
        recipientName: "Proof Recipient",
        deliveryNote: "Delivered during staging proof",
        coordinates: {
          latitude: 51.5396,
          longitude: -0.1026
        },
        otpVerified: false
      })
    });
    console.log(`PASS proof of delivery recorded | pod=${pod.id}`);

    currentJob = await fetchJson<DriverJob>(`${apiBaseUrl}/v1/driver/me/jobs/${order.order.jobId}/delivered`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${fixtures.driver.accessToken}`,
        "Idempotency-Key": `proof-delivered-${runId}`
      }
    });
    console.log(`PASS delivery completed | job=${currentJob.id} | status=${currentJob.status}`);

    await poll("payment_capture", {
      attempts: 24,
      delayMs: 1500,
      run: async () => {
        await maybeProcessOutbox(client, ids);
        const verified = await verifyRecords(client, {
          orderId: order.order.id,
          jobId: order.order.jobId,
          paymentId: order.order.paymentId
        });
        return verified.payment?.status === "CAPTURED" ? verified : null;
      }
    }).catch(() => null);

    const verified = await verifyRecords(client, {
      orderId: order.order.id,
      jobId: order.order.jobId,
      paymentId: order.order.paymentId
    });

    console.log("PASS staging_paid_delivery_proof_complete");
    console.log(
      JSON.stringify(
        {
          fixture: {
            orgId: ORG_ID,
            driverId: DRIVER_ID,
            driverUserId: fixtures.driver.userId,
            vehicleType: "BIKE",
            availability: "ONLINE",
            latestLocation: { latitude: DRIVER_LATITUDE, longitude: DRIVER_LONGITUDE }
          },
          orderId: order.order.id,
          jobId: order.order.jobId,
          offerId: offer.offerId,
          paymentId: order.order.paymentId,
          podId: verified.pod?.id ?? pod.id,
          finalJobStatus: verified.job?.status ?? currentJob.status,
          finalOrderStatus: verified.order?.status ?? order.order.status,
          paymentStatus: verified.payment?.status ?? order.payment.status,
          providerPaymentIntentId: verified.payment?.provider_payment_intent_id ?? null,
          duplicateRetry: {
            idempotencyKey: orderIdempotencyKey,
            orderId: orderReplay.order.id,
            jobId: orderReplay.order.jobId,
            paymentId: orderReplay.order.paymentId
          },
          customerOrderItemsCount: verified.customerOrderItemsCount,
          jobEventsCount: verified.jobEventsCount,
          auditLogCount: verified.auditLogCount,
          outbox: verified.outbox
        },
        null,
        2
      )
    );
  } finally {
    await client.end();
  }
}

async function main() {
  await runPaidDeliveryProof();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`FAIL staging_paid_delivery_proof | ${error instanceof Error ? error.message : "unknown_error"}`);
    process.exit(1);
  });
}
