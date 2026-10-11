import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AccountsController } from "./accounts/accounts.controller";
import { AppController } from "./app.controller";
import { AttendanceController } from "./attendance/attendance.controller";
import { AuditController } from "./audit/audit.controller";
import { AuthModule } from "./auth/auth.module";
import { CertificatesController } from "./certificates/certificates.controller";
import { CommitteeController } from "./committee/committee.controller";
import { EventsModule } from "./events/events.module";
import { FinanceController } from "./finance/finance.controller";
import { NotificationsController } from "./notifications/notifications.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { RegistrationsController } from "./registrations/registrations.controller";
import { SettingsController } from "./settings/settings.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: [".env"] }),
    PrismaModule,
    AuthModule,
    EventsModule,
  ],
  controllers: [
    AppController,
    AccountsController,
    AttendanceController,
    AuditController,
    CertificatesController,
    CommitteeController,
    FinanceController,
    NotificationsController,
    RegistrationsController,
    SettingsController,
  ],
})
export class AppModule {}
