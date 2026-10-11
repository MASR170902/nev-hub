import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters.");
  }
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api", { exclude: ["/"] });
  app.enableCors({
    origin: process.env.WEB_ORIGIN?.split(",") ?? ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  const port = process.env.API_PORT ?? 3001;
  await app.listen(port, "0.0.0.0");
}

void bootstrap();
