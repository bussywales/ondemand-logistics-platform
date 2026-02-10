import { setTimeout as delay } from "node:timers/promises";
import { Pool, type PoolClient } from "pg";
import { createLogger } from "@shipwright/observability";

type OutboxMessage = {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  retry_count: number;
};

const logger = createLogger({ name: "worker" });
let workerPool: Pool | undefined;

const config = {
  databaseUrl: process.env.DATABASE_URL,
  pollIntervalMs: Number(process.env.OUTBOX_POLL_INTERVAL_MS ?? 2000),
  batchSize: Number(process.env.OUTBOX_BATCH_SIZE ?? 20),
  maxRetries: Number(process.env.OUTBOX_MAX_RETRIES ?? 10)
};

function computeRetrySeconds(retryCount: number): number {
  const bounded = Math.min(retryCount, 6);
  return 2 ** bounded;
}

async function dispatchSideEffect(message: OutboxMessage): Promise<void> {
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

async function processOneBatch(client: PoolClient): Promise<number> {
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
      await dispatchSideEffect(message);

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

async function runWorker() {
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  workerPool = new Pool({ connectionString: config.databaseUrl, max: 5 });

  logger.info(
    {
      poll_interval_ms: config.pollIntervalMs,
      batch_size: config.batchSize,
      max_retries: config.maxRetries
    },
    "worker_started"
  );

  while (true) {
    const client = await workerPool.connect();
    try {
      await client.query("begin");
      const handled = await processOneBatch(client);
      await client.query("commit");

      if (handled === 0) {
        await delay(config.pollIntervalMs);
      }
    } catch (error) {
      await client.query("rollback");
      logger.error({ err: error }, "worker_loop_failed");
      await delay(config.pollIntervalMs);
    } finally {
      client.release();
    }
  }
}

async function shutdown() {
  logger.info("worker_shutdown_requested");
  if (workerPool) {
    await workerPool.end();
    workerPool = undefined;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runWorker().catch((error) => {
    logger.error({ err: error }, "worker_fatal");
    process.exit(1);
  });

  process.on("SIGTERM", async () => {
    await shutdown();
    process.exit(0);
  });
}

export { computeRetrySeconds };
