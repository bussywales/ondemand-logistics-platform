import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const connectionString = process.env.TEST_DATABASE_URL;
const runIntegration = Boolean(connectionString);

const describeIf = runIntegration ? describe : describe.skip;

type SeedContext = {
  orgA: string;
  orgB: string;
  consumerA: string;
  consumerB: string;
  driverUser: string;
  driverId: string;
  operatorA: string;
  quoteA: string;
  quoteB: string;
  jobA: string;
  jobB: string;
};

let client: Client;
let seed: SeedContext;

async function asAuthenticated<T>(userId: string, callback: () => Promise<T>): Promise<T> {
  await client.query("begin");
  await client.query("set local role authenticated");
  await client.query("select set_config('request.jwt.claim.role', 'authenticated', true)");
  await client.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);

  try {
    const result = await callback();
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

beforeAll(async () => {
  if (!connectionString) {
    return;
  }

  const useInsecureSsl =
    process.env.TEST_DATABASE_SSL_INSECURE === "true" ||
    connectionString.includes("supabase.co");

  client = new Client({
    connectionString,
    ssl: useInsecureSsl ? { rejectUnauthorized: false } : undefined
  });
  await client.connect();

  const ids = {
    orgA: randomUUID(),
    orgB: randomUUID(),
    consumerA: randomUUID(),
    consumerB: randomUUID(),
    driverUser: randomUUID(),
    driverId: randomUUID(),
    operatorA: randomUUID(),
    quoteA: randomUUID(),
    quoteB: randomUUID(),
    jobA: randomUUID(),
    jobB: randomUUID()
  };

  seed = ids;

  await client.query("begin");

  await client.query(
    `insert into public.users (id, email, display_name)
     values
      ($1, $6, 'Consumer A'),
      ($2, $7, 'Consumer B'),
      ($3, $8, 'Driver One'),
      ($4, $9, 'Operator A')`,
    [
      ids.consumerA,
      ids.consumerB,
      ids.driverUser,
      ids.operatorA,
      ids.orgA,
      `consumer-a+${ids.consumerA}@example.com`,
      `consumer-b+${ids.consumerB}@example.com`,
      `driver+${ids.driverUser}@example.com`,
      `operator+${ids.operatorA}@example.com`
    ]
  );

  await client.query(
    `insert into public.orgs (id, name, created_by)
     values ($1, 'Org A', $3), ($2, 'Org B', $4)`,
    [ids.orgA, ids.orgB, ids.operatorA, ids.consumerB]
  );

  await client.query(
    `insert into public.org_memberships (org_id, user_id, role)
     values
      ($1, $2, 'CONSUMER'),
      ($1, $3, 'BUSINESS_OPERATOR'),
      ($2, $4, 'CONSUMER')`,
    [ids.orgA, ids.consumerA, ids.operatorA, ids.consumerB]
  );

  await client.query(
    `insert into public.drivers (id, user_id, home_org_id, availability_status)
     values ($1, $2, $3, 'ONLINE')`,
    [ids.driverId, ids.driverUser, ids.orgA]
  );

  await client.query(
    `insert into public.driver_vehicle (driver_id, vehicle_type, plate_number)
     values ($1, 'CAR', 'ABC123')`,
    [ids.driverId]
  );

  await client.query(
    `insert into public.driver_verifications (driver_id, status, document_type, document_url, reviewed_by)
     values ($1, 'APPROVED', 'license', 'https://example.com/license.pdf', $2)`,
    [ids.driverId, ids.operatorA]
  );

  await client.query(
    `insert into public.quotes (
      id,
      org_id,
      created_by_user_id,
      distance_miles,
      eta_minutes,
      vehicle_type,
      time_of_day,
      demand_flag,
      weather_flag,
      customer_total_cents,
      driver_payout_gross_cents,
      platform_fee_cents,
      premium_distance_flag,
      pricing_version,
      breakdown_lines,
      quote_input,
      quote_output
    ) values
      (
        $1,
        $3,
        $4,
        6.5,
        22,
        'CAR',
        'LUNCH',
        false,
        false,
        2400,
        1500,
        900,
        false,
        'phase1_test_v1',
        '[]'::jsonb,
        '{"distanceMiles":6.5}'::jsonb,
        '{"customerTotalCents":2400}'::jsonb
      ),
      (
        $2,
        $5,
        $6,
        4.2,
        15,
        'CAR',
        'AFTERNOON',
        false,
        false,
        1800,
        1100,
        700,
        false,
        'phase1_test_v1',
        '[]'::jsonb,
        '{"distanceMiles":4.2}'::jsonb,
        '{"customerTotalCents":1800}'::jsonb
      )`,
    [ids.quoteA, ids.quoteB, ids.orgA, ids.consumerA, ids.orgB, ids.consumerB]
  );

  await client.query(
    `insert into public.jobs (
      id,
      org_id,
      consumer_id,
      assigned_driver_id,
      quote_id,
      status,
      pickup_address,
      dropoff_address,
      pickup_latitude,
      pickup_longitude,
      dropoff_latitude,
      dropoff_longitude,
      distance_miles,
      eta_minutes,
      customer_total_cents,
      driver_payout_gross_cents,
      platform_fee_cents,
      vehicle_required,
      idempotency_key,
      created_by_user_id,
      pricing_version,
      premium_distance_flag,
      dispatch_requested_at
    ) values
      (
        $1,
        $3,
        $4,
        $5,
        $6,
        'ASSIGNED',
        'Pickup A',
        'Dropoff A',
        51.500000,
        -0.100000,
        51.510000,
        -0.090000,
        6.5,
        22,
        2400,
        1500,
        900,
        'CAR',
        'idem-a-12345',
        $4,
        'phase1_test_v1',
        false,
        now()
      ),
      (
        $2,
        $7,
        $8,
        null,
        $9,
        'REQUESTED',
        'Pickup B',
        'Dropoff B',
        51.520000,
        -0.110000,
        51.530000,
        -0.120000,
        4.2,
        15,
        1800,
        1100,
        700,
        'CAR',
        'idem-b-12345',
        $8,
        'phase1_test_v1',
        false,
        now()
      )`,
    [
      ids.jobA,
      ids.jobB,
      ids.orgA,
      ids.consumerA,
      ids.driverId,
      ids.quoteA,
      ids.orgB,
      ids.consumerB,
      ids.quoteB
    ]
  );

  await client.query("commit");
});

afterAll(async () => {
  if (!client) {
    return;
  }

  try {
    await client.query("begin");
    await client.query("delete from public.jobs where id = $1 or id = $2", [seed.jobA, seed.jobB]);
    await client.query("delete from public.quotes where id = $1 or id = $2", [seed.quoteA, seed.quoteB]);
    await client.query("delete from public.driver_verifications where driver_id = $1", [seed.driverId]);
    await client.query("delete from public.driver_vehicle where driver_id = $1", [seed.driverId]);
    await client.query("delete from public.drivers where id = $1", [seed.driverId]);
    await client.query(
      "delete from public.org_memberships where org_id = $1 or org_id = $2",
      [seed.orgA, seed.orgB]
    );
    await client.query("delete from public.orgs where id = $1 or id = $2", [seed.orgA, seed.orgB]);
    await client.query(
      "delete from public.users where id = $1 or id = $2 or id = $3 or id = $4",
      [seed.consumerA, seed.consumerB, seed.driverUser, seed.operatorA]
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }

  await client.end();
});

describeIf("RLS isolation", () => {
  it("consumer only sees self-created jobs", async () => {
    const result = await asAuthenticated(seed.consumerA, () =>
      client.query("select id from public.jobs order by id")
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].id).toEqual(seed.jobA);
  });

  it("driver only sees assigned jobs", async () => {
    const result = await asAuthenticated(seed.driverUser, () =>
      client.query("select id from public.jobs order by id")
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].id).toEqual(seed.jobA);
  });

  it("business operator only sees jobs in their org", async () => {
    const result = await asAuthenticated(seed.operatorA, () =>
      client.query("select id from public.jobs order by id")
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].id).toEqual(seed.jobA);
  });

  it("consumer only sees self-created quotes", async () => {
    const result = await asAuthenticated(seed.consumerA, () =>
      client.query("select id from public.quotes order by id")
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].id).toEqual(seed.quoteA);
  });
});
