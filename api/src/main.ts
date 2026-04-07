import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";

const DEFAULT_CORS_ORIGINS = ["http://localhost:3000", "http://0.0.0.0:3000"];

function parseCorsOrigins(rawCorsOrigins: string) {
  const parsedOrigins = rawCorsOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return parsedOrigins.length > 0 ? parsedOrigins : DEFAULT_CORS_ORIGINS;
}

type CorsOriginCallback = (error: Error | null, allow?: boolean) => void;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>("PORT", 4000);
  const corsOrigins = parseCorsOrigins(
    configService.get<string>("CORS_ORIGIN", DEFAULT_CORS_ORIGINS.join(","))
  );

  app.enableCors({
    origin(origin: string | undefined, callback: CorsOriginCallback) {
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} not allowed by CORS.`), false);
    },
    credentials: true
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );

  await app.listen(port);
}

bootstrap();
