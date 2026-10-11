import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { Role } from "../common/enums";
import { AuthUser, JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { PrismaService } from "../prisma/prisma.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Controller("audit")
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query("take") take: string | undefined, @CurrentUser() _user: AuthUser) {
    const limit = Math.min(Math.max(Number(take) || 50, 1), 200);
    const logs = await this.prisma.auditLog.findMany({
      take: limit,
      include: { actor: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
    return logs.map((log) => {
      let details: unknown = log.details;
      try {
        if (typeof details === "string") details = JSON.parse(details);
      } catch {}
      return { ...log, details };
    });
  }
}
