import { Injectable } from "@nestjs/common";
import { PgService } from "../database/pg.service.js";

@Injectable()
export class PlatformAdminService {
  constructor(private readonly pg: PgService) {}

  async isPlatformAdmin(userId: string) {
    const result = await this.pg.query<{ user_id: string }>(
      `select user_id
       from public.platform_admins
       where user_id = $1
         and is_active = true
       limit 1`,
      [userId]
    );

    return result.rowCount === 1;
  }
}
