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
    jobA: randomUUID(),
    jobB: randomUUID()
  };

  seed = ids;

  await client.query("begin");

  await client.query(
    `insert into public.users (id, email, display_name)
     values
      ($1, $5, 'Consumer A'),
      ($2, $6, 'Consumer B'),
      ($3, $7, 'Driver One'),
      ($4, $8, 'Operator A')`,
    [
      ids.consumerA,
      ids.consumerB,
      ids.driverUser,
      ids.operatorA,
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
     values ($1, $2, 'CONSUMER')`,
    [ids.orgA, ids.consumerA]
  );

  await client.query(
    `insert into public.org_memberships (org_id, user_id, role)
     values ($1, $2, 'BUSINESS_OPERATOR')`,
    [ids.orgA, ids.operatorA]
  );

  await client.query(
    `insert into public.org_memberships (org_id, user_id, role)
     values ($1, $2, 'CONSUMER')`,
    [ids.orgB, ids.consumerB]
  );

  await client.query(
    `insert into public.drivers (id, user_id, home_org_id)
     values ($1, $2, $3)`,
    [ids.driverId, ids.driverUser, ids.orgA]
  );

  await client.query(
    `insert into public.jobs (
      id, org_id, consumer_id, assigned_driver_id, status, pickup_address,
      dropoff_address, distance_miles, quoted_payout_cents, supply_type,
      idempotency_key, created_by
    ) values
      ($1, $3, $4, $5, 'ASSIGNED', 'Pickup A', 'Dropoff A', 6.5, 1200, 'BIKE', 'idem-a-12345', $4),
      ($2, $6, $7, null, 'CREATED', 'Pickup B', 'Dropoff B', 4.2, 1000, 'CAR', 'idem-b-12345', $7)`,
    [ids.jobA, ids.jobB, ids.orgA, ids.consumerA, ids.driverId, ids.orgB, ids.consumerB]
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
    await client.query("delete from public.drivers where id = $1", [seed.driverId]);
    await client.query("delete from public.org_memberships where org_id = $1 or org_id = $2", [seed.orgA, seed.orgB]);
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
});
