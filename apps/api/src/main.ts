import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { readConfig } from "./config.js";
import { createLogger, requestContextMiddleware } from "@shipwright/observability";
import { GlobalExceptionFilter } from "./errors/global-exception.filter.js";
import { startWorker } from "./worker/startWorker.js";

async function bootstrap() {
  const logger = createLogger({ name: "api" });
  const config = readConfig();
  logger.info({ port: process.env.PORT }, "config_loaded");
  process.on("unhandledRejection", (reason) => {
    logger.error({ reason }, "unhandled_rejection");
  });
  process.on("uncaughtException", (err) => {
    logger.error({ err }, "uncaught_exception");
  });

  const app = await NestFactory.create(AppModule, {
    logger: false
  });

  app.use(requestContextMiddleware(logger));
  app.useGlobalFilters(new GlobalExceptionFilter(logger));

  const port = config.port;
  await app.listen(port, "0.0.0.0");
  logger.info({ port, host: "0.0.0.0" }, "api_started");
  setTimeout(() => {
    try {
      const p = startWorker(logger);
      if (p && typeof (p as { catch?: (handler: (error: unknown) => void) => void }).catch === "function") {
        (p as Promise<unknown>).catch((err) => logger.error({ err }, "worker_failed"));
      }
    } catch (err) {
      logger.error({ err }, "worker_failed_sync");
    }
  }, 0);
}

bootstrap().catch((error) => {
  const logger = createLogger({ name: "api" });
  logger.error({ err: error }, "api_boot_failed");
  process.exit(1);
});
