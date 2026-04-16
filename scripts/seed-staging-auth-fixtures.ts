import { Client, type ClientConfig } from "pg";

type FixtureSpec = {
  slug: "business" | "driver" | "consumer";
  email: string;
  password: string;
  displayName: string;
};

type FixtureAuth = {
  userId: string;
  accessToken: string;
};

const ORG_ID = "70d56b02-f2b8-487a-8c97-8e30fd9e631f";
const DRIVER_ID = "8a5d2d96-4f0a-4711-b8b0-7ed9478d41a7";

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

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function createPgConfig(connectionString: string): ClientConfig {
  const url = new URL(connectionString);
  url.searchParams.delete("sslmode");

  return {
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: false }
  };
}

async function readJson(response: Response) {
  const text = await response.text();
  return text.length === 0 ? {} : (JSON.parse(text) as Record<string, unknown>);
}

async function signUpOrReuseUser(
  supabaseUrl: string,
  anonKey: string,
  fixture: FixtureSpec
): Promise<FixtureAuth> {
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

  const tokenPayload = await readJson(tokenResponse);
  if (!tokenResponse.ok) {
    throw new Error(`password_grant_failed:${fixture.slug}:${tokenResponse.status}:${JSON.stringify(tokenPayload)}`);
  }

  const user = tokenPayload.user as { id?: string } | undefined;
  const accessToken = tokenPayload.access_token;
  if (!user?.id || typeof accessToken !== "string") {
    throw new Error(`fixture_token_payload_invalid:${fixture.slug}`);
  }

  return {
    userId: user.id,
    accessToken
  };
}

async function seedDomainRows(
  databaseUrl: string,
  fixtures: Record<FixtureSpec["slug"], FixtureAuth>
) {
  const client = new Client(createPgConfig(databaseUrl));
  await client.connect();

  try {
    await client.query("begin");

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
      `insert into public.drivers (id, user_id, home_org_id, is_active, availability_status)
       values ($1, $2, $3, true, 'OFFLINE')
       on conflict (id) do update
       set user_id = excluded.user_id,
           home_org_id = excluded.home_org_id,
           is_active = true`,
      [DRIVER_ID, fixtures.driver.userId, ORG_ID]
    );

    await client.query(
      `delete from public.driver_vehicle
       where driver_id = $1
         and not (vehicle_type = 'CAR' and coalesce(plate_number, '') = 'STAGING1' and is_primary = true)`,
      [DRIVER_ID]
    );

    await client.query(
      `insert into public.driver_vehicle (driver_id, vehicle_type, plate_number, is_primary)
       select $1, 'CAR', 'STAGING1', true
       where not exists (
         select 1
         from public.driver_vehicle
         where driver_id = $1
           and vehicle_type = 'CAR'
           and plate_number = 'STAGING1'
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
  } finally {
    await client.end();
  }
}

async function main() {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const anonKey = requireEnv("SUPABASE_ANON_KEY");
  const databaseUrl = requireEnv("DATABASE_URL");

  const results = Object.fromEntries(
    await Promise.all(
      FIXTURES.map(async (fixture) => [fixture.slug, await signUpOrReuseUser(supabaseUrl, anonKey, fixture)])
    )
  ) as Record<FixtureSpec["slug"], FixtureAuth>;

  await seedDomainRows(databaseUrl, results);

  console.log("staging_auth_fixtures_ready");
  console.log(JSON.stringify({
    orgId: ORG_ID,
    driverId: DRIVER_ID,
    fixtures: FIXTURES.map((fixture) => ({
      slug: fixture.slug,
      email: fixture.email,
      password: fixture.password,
      userId: results[fixture.slug].userId,
      accessToken: results[fixture.slug].accessToken
    }))
  }, null, 2));
}

void main().catch((error) => {
  console.error("staging_auth_fixtures_failed", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
