import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { readConfig } from "./config.js";
import { createLogger, requestContextMiddleware } from "@shipwright/observability";
import { GlobalExceptionFilter } from "./errors/global-exception.filter.js";
import { startWorker } from "./worker/startWorker.js";

async function bootstrap() {
  console.log("BOOT: start");
  const logger = createLogger({ name: "api" });
  readConfig();
  console.log("BOOT: config ok");
  logger.info({ port: process.env.PORT }, "config_loaded");
  process.on("unhandledRejection", (err) => {
    console.error("UNHANDLED REJECTION", err);
  });
  process.on("uncaughtException", (err) => {
    console.error("UNCAUGHT EXCEPTION", err);
  });

  const app = await NestFactory.create(AppModule, {
    logger: false,
    rawBody: true,
    abortOnError: false
  });

  app.use(requestContextMiddleware(logger));
  app.useGlobalFilters(new GlobalExceptionFilter(logger));

  const port = Number(process.env.PORT ?? 10000);
  console.log("BOOT: will listen", port);
  await app.listen(port, "0.0.0.0");
  console.log("BOOT: api_started on port", port);
  logger.info({ port, host: "0.0.0.0" }, "api_started");
  setTimeout(() => {
    try {
      console.log("BOOT: starting worker");
      const p: unknown = startWorker(logger);
      if (p && typeof (p as { catch?: (handler: (error: unknown) => void) => void }).catch === "function") {
        (p as Promise<unknown>).catch((err) => {
          console.error("WORKER: async failure", err);
        });
      }
    } catch (err) {
      console.error("WORKER: sync failure", err);
    }
  }, 2000);
}

bootstrap().catch((error) => {
  console.error("BOOT: failed", error);
  const logger = createLogger({ name: "api" });
  logger.error({ err: error }, "api_boot_failed");
  process.exit(1);
});
