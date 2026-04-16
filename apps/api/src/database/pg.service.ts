import { Injectable, OnModuleDestroy } from "@nestjs/common";
import {
  Pool,
  type PoolClient,
  type PoolConfig,
  type QueryResult,
  type QueryResultRow
} from "pg";
import { ConflictException } from "@nestjs/common";
import { readConfig } from "../config.js";

function createPgPoolConfig(connectionString: string, max: number): PoolConfig {
  const url = new URL(connectionString);
  url.searchParams.delete("sslmode");

  return {
    connectionString: url.toString(),
    max,
    ssl: { rejectUnauthorized: false }
  };
}

@Injectable()
export class PgService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor() {
    const config = readConfig();
    this.pool = new Pool(
      createPgPoolConfig(
        config.databaseUrl,
        Number(process.env.DATABASE_POOL_SIZE ?? 10)
      )
    );
  }

  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  async withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const result = await callback(client);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async withIdempotency<T extends Record<string, unknown>>(input: {
    actorId: string;
    endpoint: string;
    idempotencyKey: string;
    execute: (client: PoolClient) => Promise<{ responseCode: number; body: T }>;
  }): Promise<{ replay: boolean; responseCode: number; body: T }> {
    return this.withTransaction(async (client) => {
      const inserted = await client.query(
        `insert into public.idempotency_keys (actor_id, key, endpoint)
         values ($1, $2, $3)
         on conflict (actor_id, endpoint, key) do nothing
         returning id`,
        [input.actorId, input.idempotencyKey, input.endpoint]
      );

      if (inserted.rowCount === 0) {
        const cached = await client.query<{
          response_code: number | null;
          response_body: T | null;
        }>(
          `select response_code, response_body
           from public.idempotency_keys
           where actor_id = $1 and endpoint = $2 and key = $3`,
          [input.actorId, input.endpoint, input.idempotencyKey]
        );

        if (cached.rowCount !== 1 || !cached.rows[0].response_body) {
          throw new ConflictException("idempotency_record_missing_response");
        }

        return {
          replay: true,
          responseCode: cached.rows[0].response_code ?? 200,
          body: cached.rows[0].response_body
        };
      }

      const result = await input.execute(client);

      await client.query(
        `update public.idempotency_keys
         set response_code = $1,
             response_body = $2::jsonb
         where actor_id = $3 and endpoint = $4 and key = $5`,
        [
          result.responseCode,
          JSON.stringify(result.body),
          input.actorId,
          input.endpoint,
          input.idempotencyKey
        ]
      );

      return {
        replay: false,
        ...result
      };
    });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
