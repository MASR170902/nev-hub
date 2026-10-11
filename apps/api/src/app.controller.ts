import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get()
  root() {
    return {
      status: "online",
      service: "NEVHub Backend API",
      message: "Backend API aktif dan berjalan normal! Silakan buka frontend di http://localhost:3000",
      endpoints: {
        health: "/api/health",
        login: "/api/auth/login",
        events: "/api/events",
      },
    };
  }

  @Get("health")
  health() {
    return { status: "ok", service: "nevhub-api" };
  }
}
