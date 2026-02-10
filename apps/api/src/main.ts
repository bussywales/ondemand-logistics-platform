import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { readConfig } from "./config.js";
import { createLogger, requestContextMiddleware } from "@shipwright/observability";
import { GlobalExceptionFilter } from "./errors/global-exception.filter.js";

async function bootstrap() {
  const config = readConfig();
  const logger = createLogger({ name: "api" });

  const app = await NestFactory.create(AppModule, {
    logger: false
  });

  app.use(requestContextMiddleware(logger));
  app.useGlobalFilters(new GlobalExceptionFilter(logger));

  await app.listen(config.port, "0.0.0.0");
  logger.info({ port: config.port }, "api_started");
}

bootstrap().catch((error) => {
  const logger = createLogger({ name: "api" });
  logger.error({ err: error }, "api_boot_failed");
  process.exit(1);
});
