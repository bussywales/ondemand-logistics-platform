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

type AppLogger = ReturnType<typeof createLogger>;
const SYSTEM_ACTOR_ID = "00000000-0000-0000-0000-000000000000";
const LOOP_YIELD_MS = 100;

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

async function dispatchSideEffect(message: OutboxMessage, logger: AppLogger): Promise<void> {
  logger.info(
    {
      event_type: message.event_type,
      entity_id: message.aggregate_id,
      outbox_message_id: message.id,
      request_id: message.payload.requestId
    },
    "outbox_dispatch_attempt"
  );

  // Phase 0: foundation worker dispatch stub.
  return;
}

async function processBatchWithLogger(
  client: PoolClient,
  config: WorkerConfig,
  logger: AppLogger
): Promise<number> {
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
      await dispatchSideEffect(message, logger);

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

  while (true) {
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

export { computeRetrySeconds };
