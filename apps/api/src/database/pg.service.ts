import { Injectable, OnModuleDestroy } from "@nestjs/common";
import {
  Pool,
  type PoolClient,
  type QueryResult,
  type QueryResultRow
} from "pg";
import { readConfig } from "../config.js";

@Injectable()
export class PgService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor() {
    const config = readConfig();
    this.pool = new Pool({
      connectionString: config.databaseUrl,
      max: Number(process.env.DATABASE_POOL_SIZE ?? 10)
    });
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

  async onModuleDestroy() {
    await this.pool.end();
  }
}
