import { setTimeout as delay } from "node:timers/promises";
import { Pool, type PoolClient, type PoolConfig } from "pg";
import { createLogger } from "@shipwright/observability";

type OutboxMessage = {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  retry_count: number;
};

type DispatchJob = {
  id: string;
  org_id: string | null;
  consumer_id: string;
  assigned_driver_id: string | null;
  status: string;
  vehicle_required: "BIKE" | "CAR";
  distance_miles: string;
  eta_minutes: number;
  driver_payout_gross_cents: number;
  pickup_latitude: string;
  pickup_longitude: string;
};

type DispatchCandidate = {
  driver_id: string;
  user_id: string;
  latest_latitude: string | null;
  latest_longitude: string | null;
  reliability_score: string;
};

type CreatedOffer = {
  id: string;
  driver_id: string;
  expires_at: string;
};

type OfferState = {
  offer_id: string;
  job_id: string;
  driver_id: string;
  status: string;
  expires_at: string;
};

type AppLogger = ReturnType<typeof createLogger>;
const SYSTEM_ACTOR_ID = "00000000-0000-0000-0000-000000000000";
const LOOP_YIELD_MS = 100;
const OFFER_TTL_SECONDS = Number(process.env.DISPATCH_OFFER_TTL_SECONDS ?? 30);

const defaultLogger = createLogger({ name: "worker" });
let activeLogger: AppLogger = defaultLogger;
let workerPool: Pool | undefined;
let workerRunning = false;

const baseConfig = {
  pollIntervalMs: Number(process.env.OUTBOX_POLL_INTERVAL_MS ?? 2000),
  batchSize: Number(process.env.OUTBOX_BATCH_SIZE ?? 20),
  maxRetries: Number(process.env.OUTBOX_MAX_RETRIES ?? 10)
};
type WorkerConfig = typeof baseConfig & { databaseUrl: string };

function createPgPoolConfig(connectionString: string, max: number): PoolConfig {
  const url = new URL(connectionString);
  url.searchParams.delete("sslmode");

  return {
    connectionString: url.toString(),
    max,
    ssl: { rejectUnauthorized: false }
  };
}

function computeRetrySeconds(retryCount: number): number {
  const bounded = Math.min(retryCount, 6);
  return 2 ** bounded;
}

function readWorkerConfig(): WorkerConfig {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  return {
    ...baseConfig,
    databaseUrl
  };
}

async function applyWorkerSystemContext(client: PoolClient, logger: AppLogger) {
  logger.info({ step: "session_init" }, "worker_session_init_start");
  logger.info(
    {
      step: "apply_system_context",
      system_actor_id: SYSTEM_ACTOR_ID
    },
    "worker_context_init"
  );

  await client.query(
    `select
       set_config('request.jwt.claim.role', 'service_role', true),
       set_config('request.jwt.claim.sub', $1, true),
       set_config('request.jwt.claim.email', 'system@shipwright.local', true),
       set_config('request.jwt.claims', $2, true)`,
    [
      SYSTEM_ACTOR_ID,
      JSON.stringify({
        role: "service_role",
        sub: SYSTEM_ACTOR_ID,
        email: "system@shipwright.local"
      })
    ]
  );

  logger.info({ step: "session_init" }, "worker_session_init_ok");
}

async function insertJobEvent(
  client: PoolClient,
  input: { jobId: string; eventType: string; actorId: string | null; payload: Record<string, unknown> }
) {
  await client.query(
    `insert into public.job_events (job_id, event_type, payload, actor_id)
     values ($1, $2, $3::jsonb, $4)`,
    [input.jobId, input.eventType, JSON.stringify(input.payload), input.actorId]
  );
}

async function insertAuditLog(
  client: PoolClient,
  input: {
    requestId: string;
    actorId: string | null;
    orgId: string | null;
    entityType: string;
    entityId: string;
    action: string;
    metadata: Record<string, unknown>;
  }
) {
  await client.query(
    `insert into public.audit_log (
       request_id,
       actor_id,
       org_id,
       entity_type,
       entity_id,
       action,
       metadata
     ) values ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
    [
      input.requestId,
      input.actorId,
      input.orgId,
      input.entityType,
      input.entityId,
      input.action,
      JSON.stringify(input.metadata)
    ]
  );
}

async function enqueueOutboxMessage(
  client: PoolClient,
  input: {
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    payload: Record<string, unknown>;
    idempotencyKey: string;
    nextAttemptAt?: string;
  }
) {
  await client.query(
    `insert into public.outbox_messages (
       aggregate_type,
       aggregate_id,
       event_type,
       payload,
       idempotency_key,
       next_attempt_at
     ) values ($1, $2, $3, $4::jsonb, $5, coalesce($6::timestamptz, now()))
     on conflict (event_type, idempotency_key) do nothing`,
    [
      input.aggregateType,
      input.aggregateId,
      input.eventType,
      JSON.stringify(input.payload),
      input.idempotencyKey,
      input.nextAttemptAt ?? null
    ]
  );
}

async function loadDispatchJob(client: PoolClient, jobId: string): Promise<DispatchJob | null> {
  const result = await client.query<DispatchJob>(
    `select id,
            org_id,
            consumer_id,
            assigned_driver_id,
            status,
            vehicle_required,
            distance_miles,
            eta_minutes,
            driver_payout_gross_cents,
            pickup_latitude,
            pickup_longitude
     from public.jobs
     where id = $1
     for update`,
    [jobId]
  );

  return result.rows[0] ?? null;
}

async function hasActiveOffer(client: PoolClient, jobId: string) {
  const result = await client.query(
    `select 1
     from public.job_offers
     where job_id = $1
       and status = 'OFFERED'
       and expires_at > now()
     limit 1`,
    [jobId]
  );

  return (result.rowCount ?? 0) > 0;
}

async function selectDispatchCandidates(
  client: PoolClient,
  job: DispatchJob
): Promise<DispatchCandidate[]> {
  const result = await client.query<DispatchCandidate>(
    `select d.id as driver_id,
            d.user_id,
            d.latest_latitude,
            d.latest_longitude,
            d.reliability_score::text
     from public.drivers d
     where d.is_active = true
       and d.availability_status = 'ONLINE'
       and d.active_job_id is null
       and exists (
         select 1
         from public.driver_verifications dvf
         where dvf.driver_id = d.id
           and dvf.status = 'APPROVED'
       )
       and exists (
         select 1
         from public.driver_vehicle dv
         where dv.driver_id = d.id
           and dv.vehicle_type = $1
       )
       and not exists (
         select 1
         from public.job_offers o
         where o.job_id = $2
           and o.driver_id = d.id
       )
     order by
       case
         when d.latest_latitude is null or d.latest_longitude is null then 1
         else 0
       end asc,
       power(coalesce(d.latest_latitude, $3::numeric) - $3::numeric, 2)
         + power(coalesce(d.latest_longitude, $4::numeric) - $4::numeric, 2) asc,
       d.reliability_score desc,
       d.created_at asc
     limit 10`,
    [job.vehicle_required, job.id, job.pickup_latitude, job.pickup_longitude]
  );

  return result.rows;
}

async function markDispatchFailed(
  client: PoolClient,
  job: DispatchJob,
  requestId: string,
  reason: string,
  logger: AppLogger
) {
  await client.query(
    `update public.jobs
     set status = 'DISPATCH_FAILED',
         dispatch_failed_at = now(),
         updated_at = now()
     where id = $1`,
    [job.id]
  );

  await insertJobEvent(client, {
    jobId: job.id,
    eventType: "JOB_DISPATCH_FAILED",
    actorId: null,
    payload: {
      requestId,
      reason
    }
  });

  await insertAuditLog(client, {
    requestId,
    actorId: null,
    orgId: job.org_id,
    entityType: "job",
    entityId: job.id,
    action: "job_dispatch_failed",
    metadata: {
      reason
    }
  });

  logger.info({ job_id: job.id, reason }, "dispatch_no_candidate");
}

async function createSequentialOffer(
  client: PoolClient,
  job: DispatchJob,
  requestId: string,
  logger: AppLogger
) {
  const candidates = await selectDispatchCandidates(client, job);
  if (candidates.length === 0) {
    await markDispatchFailed(client, job, requestId, "no_eligible_drivers", logger);
    return;
  }

  const selected = candidates[0];
  const inserted = await client.query<CreatedOffer>(
    `insert into public.job_offers (
       job_id,
       driver_id,
       offered_at,
       expires_at,
       status,
       payout_gross_snapshot,
       distance_miles_snapshot,
       eta_minutes_snapshot
     ) values (
       $1,
       $2,
       now(),
       now() + make_interval(secs => $3),
       'OFFERED',
       $4,
       $5,
       $6
     )
     returning id, driver_id, expires_at`,
    [
      job.id,
      selected.driver_id,
      OFFER_TTL_SECONDS,
      job.driver_payout_gross_cents,
      Number(job.distance_miles),
      job.eta_minutes
    ]
  );

  const offer = inserted.rows[0];

  await client.query(
    `update public.jobs
     set status = 'REQUESTED',
         dispatch_failed_at = null,
         updated_at = now()
     where id = $1`,
    [job.id]
  );

  await insertJobEvent(client, {
    jobId: job.id,
    eventType: "JOB_OFFERED",
    actorId: null,
    payload: {
      requestId,
      offerId: offer.id,
      driverId: offer.driver_id,
      expiresAt: offer.expires_at
    }
  });

  await insertAuditLog(client, {
    requestId,
    actorId: null,
    orgId: job.org_id,
    entityType: "job_offer",
    entityId: offer.id,
    action: "job_offer_created",
    metadata: {
      jobId: job.id,
      driverId: offer.driver_id,
      expiresAt: offer.expires_at,
      payoutGrossCents: job.driver_payout_gross_cents,
      distanceMiles: Number(job.distance_miles),
      etaMinutes: job.eta_minutes
    }
  });

  await enqueueOutboxMessage(client, {
    aggregateType: "job_offer",
    aggregateId: offer.id,
    eventType: "JOB_OFFER_EXPIRY_CHECK",
    payload: {
      jobId: job.id,
      offerId: offer.id,
      requestId
    },
    idempotencyKey: `offer-expiry:${offer.id}`,
    nextAttemptAt: offer.expires_at
  });

  logger.info(
    {
      job_id: job.id,
      offer_id: offer.id,
      driver_id: offer.driver_id,
      expires_at: offer.expires_at
    },
    "dispatch_offer_created"
  );
}

async function handleDispatchRequested(
  client: PoolClient,
  message: OutboxMessage,
  logger: AppLogger
): Promise<void> {
  const jobId = String(message.payload.jobId ?? message.aggregate_id);
  const requestId = String(message.payload.requestId ?? message.id);
  const job = await loadDispatchJob(client, jobId);

  if (!job) {
    logger.warn({ job_id: jobId, outbox_message_id: message.id }, "dispatch_job_missing");
    return;
  }

  if (!["REQUESTED", "DISPATCH_FAILED"].includes(job.status) || job.assigned_driver_id) {
    logger.info({ job_id: job.id, status: job.status }, "dispatch_skipped_job_not_requestable");
    return;
  }

  if (await hasActiveOffer(client, job.id)) {
    logger.info({ job_id: job.id }, "dispatch_skipped_active_offer_exists");
    return;
  }

  await createSequentialOffer(client, job, requestId, logger);
}

async function handleOfferExpiryCheck(
  client: PoolClient,
  message: OutboxMessage,
  logger: AppLogger
): Promise<void> {
  const offerId = String(message.payload.offerId ?? message.aggregate_id);
  const requestId = String(message.payload.requestId ?? message.id);
  const offerResult = await client.query<OfferState>(
    `select o.id as offer_id,
            o.job_id,
            o.driver_id,
            o.status,
            o.expires_at
     from public.job_offers o
     where o.id = $1
     for update`,
    [offerId]
  );

  const offer = offerResult.rows[0];
  if (!offer) {
    logger.warn({ offer_id: offerId, outbox_message_id: message.id }, "dispatch_offer_missing");
    return;
  }

  if (offer.status !== "OFFERED") {
    logger.info({ offer_id: offerId, status: offer.status }, "dispatch_offer_not_open");
    return;
  }

  if (new Date(offer.expires_at).getTime() > Date.now()) {
    logger.info({ offer_id: offerId, expires_at: offer.expires_at }, "dispatch_offer_not_expired_yet");
    return;
  }

  const expired = await client.query(
    `update public.job_offers
     set status = 'EXPIRED',
         responded_at = now()
     where id = $1 and status = 'OFFERED'`,
    [offerId]
  );

  if ((expired.rowCount ?? 0) === 0) {
    logger.info({ offer_id: offerId }, "dispatch_offer_already_resolved");
    return;
  }

  const job = await loadDispatchJob(client, offer.job_id);
  if (!job) {
    logger.warn({ job_id: offer.job_id, offer_id: offerId }, "dispatch_job_missing_after_expiry");
    return;
  }

  await insertJobEvent(client, {
    jobId: job.id,
    eventType: "JOB_OFFER_EXPIRED",
    actorId: null,
    payload: {
      requestId,
      offerId,
      driverId: offer.driver_id
    }
  });

  await insertAuditLog(client, {
    requestId,
    actorId: null,
    orgId: job.org_id,
    entityType: "job_offer",
    entityId: offerId,
    action: "job_offer_expired",
    metadata: {
      jobId: job.id,
      driverId: offer.driver_id
    }
  });

  if (job.status !== "REQUESTED" || job.assigned_driver_id) {
    logger.info({ job_id: job.id, status: job.status }, "dispatch_expiry_job_not_requestable");
    return;
  }

  await createSequentialOffer(client, job, requestId, logger);
}

export async function dispatchSideEffect(
  client: PoolClient,
  message: OutboxMessage,
  logger: AppLogger
): Promise<void> {
  logger.info(
    {
      event_type: message.event_type,
      entity_id: message.aggregate_id,
      outbox_message_id: message.id,
      request_id: message.payload.requestId
    },
    "outbox_dispatch_attempt"
  );

  switch (message.event_type) {
    case "JOB_DISPATCH_REQUESTED":
      await handleDispatchRequested(client, message, logger);
      return;
    case "JOB_OFFER_EXPIRY_CHECK":
      await handleOfferExpiryCheck(client, message, logger);
      return;
    default:
      logger.info({ event_type: message.event_type }, "outbox_dispatch_noop");
  }
}

async function processBatchWithLogger(
  client: PoolClient,
  config: WorkerConfig,
  logger: AppLogger
): Promise<number> {
  logger.info({ batch_size: config.batchSize }, "worker_claim_batch_start");
  const { rows } = await client.query<OutboxMessage>(
    `select id, aggregate_type, aggregate_id, event_type, payload, retry_count
     from public.outbox_messages
     where processed_at is null
       and next_attempt_at <= now()
     order by created_at
     limit $1
     for update skip locked`,
    [config.batchSize]
  );

  for (const message of rows) {
    try {
      await dispatchSideEffect(client, message, logger);

      await client.query(
        `update public.outbox_messages
         set processed_at = now(),
             retry_count = retry_count + 1,
             last_error = null
         where id = $1`,
        [message.id]
      );

      logger.info(
        {
          outbox_message_id: message.id,
          event_type: message.event_type,
          entity_id: message.aggregate_id,
          request_id: message.payload.requestId,
          attempt: message.retry_count + 1
        },
        "outbox_dispatch_success"
      );
    } catch (error) {
      const nextRetryCount = message.retry_count + 1;
      const retrySeconds = computeRetrySeconds(nextRetryCount);
      const terminal = nextRetryCount >= config.maxRetries;

      await client.query(
        `update public.outbox_messages
         set retry_count = retry_count + 1,
             next_attempt_at = case
               when $2::boolean then now()
               else now() + make_interval(secs => $3)
             end,
             last_error = $4,
             processed_at = case
               when $2::boolean then now()
               else processed_at
             end
         where id = $1`,
        [
          message.id,
          terminal,
          retrySeconds,
          error instanceof Error ? error.message : "unknown_error"
        ]
      );

      logger.error(
        {
          outbox_message_id: message.id,
          event_type: message.event_type,
          entity_id: message.aggregate_id,
          request_id: message.payload.requestId,
          attempt: nextRetryCount,
          retry_delay_seconds: retrySeconds,
          terminal,
          err: error
        },
        terminal ? "outbox_dispatch_failed_terminal" : "outbox_dispatch_failed_retry"
      );
    }
  }

  return rows.length;
}

async function runWorker(config: WorkerConfig, logger: AppLogger) {
  workerPool = new Pool(createPgPoolConfig(config.databaseUrl, 5));

  logger.info(
    {
      poll_interval_ms: config.pollIntervalMs,
      batch_size: config.batchSize,
      max_retries: config.maxRetries
    },
    "worker_started"
  );

  while (workerRunning) {
    let client: PoolClient | undefined;
    try {
      logger.info({ batch_size: config.batchSize }, "worker_poll_tick");
      logger.info({ step: "pool_connect" }, "worker_db_connect_start");
      client = await workerPool.connect();
      logger.info({ step: "pool_connect" }, "worker_db_connect_ok");
      await client.query("begin");
      await applyWorkerSystemContext(client, logger);
      const handled = await processBatchWithLogger(client, config, logger);
      await client.query("commit");

      if (handled === 0) {
        logger.info({ poll_interval_ms: config.pollIntervalMs }, "worker_idle");
        await delay(config.pollIntervalMs);
        continue;
      }

      await delay(LOOP_YIELD_MS);
    } catch (error) {
      if (client) {
        try {
          await client.query("rollback");
        } catch (rollbackError) {
          logger.error({ err: rollbackError }, "worker_rollback_failed");
        }
      }

      logger.error({ err: error }, "worker_error");
      await delay(config.pollIntervalMs);
    } finally {
      client?.release();
    }
  }
}

async function shutdown() {
  activeLogger.info("worker_shutdown_requested");
  workerRunning = false;
  if (workerPool) {
    await workerPool.end();
    workerPool = undefined;
  }
}

export function startWorker(logger?: AppLogger) {
  if (workerRunning) {
    activeLogger.warn("worker_already_started");
    return;
  }

  const scopedLogger = (logger ?? defaultLogger).child({ component: "worker" });
  activeLogger = scopedLogger;
  workerRunning = true;

  let config: WorkerConfig;

  try {
    config = readWorkerConfig();
  } catch (error) {
    workerRunning = false;
    scopedLogger.error({ err: error }, "worker_fatal");
    return;
  }

  void runWorker(config, scopedLogger).catch((error) => {
    workerRunning = false;
    scopedLogger.error({ err: error }, "worker_fatal");
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    startWorker();
  } catch (error) {
    defaultLogger.error({ err: error }, "worker_fatal");
    process.exit(1);
  }

  process.on("SIGTERM", async () => {
    await shutdown();
    process.exit(0);
  });
}

export { computeRetrySeconds, createSequentialOffer, handleDispatchRequested, handleOfferExpiryCheck };
