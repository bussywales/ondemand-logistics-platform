import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { readConfig } from "./config.js";
import { createLogger, requestContextMiddleware } from "@shipwright/observability";
import { GlobalExceptionFilter } from "./errors/global-exception.filter.js";

async function bootstrap() {
  const logger = createLogger({ name: "api" });
  const config = readConfig();
  logger.info({ port: process.env.PORT }, "config_loaded");

  const app = await NestFactory.create(AppModule, {
    logger: false
  });

  app.use(requestContextMiddleware(logger));
  app.useGlobalFilters(new GlobalExceptionFilter(logger));

  const port = config.port;
  await app.listen(port, "0.0.0.0");
  logger.info({ port, host: "0.0.0.0" }, "api_started");
}

bootstrap().catch((error) => {
  const logger = createLogger({ name: "api" });
  logger.error({ err: error }, "api_boot_failed");
  process.exit(1);
});
