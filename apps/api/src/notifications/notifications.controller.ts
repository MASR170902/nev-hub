import { Controller, Get, Patch, Param, UseGuards } from "@nestjs/common";
import { JwtAuthGuard, AuthUser } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";

@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.prisma.notification.findMany({
      where: { OR: [{ userId: user.sub }, { userId: null }] },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  @Patch(":id/read")
  markRead(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.prisma.notification.updateMany({
      where: { id, userId: user.sub },
      data: { readAt: new Date() },
    });
  }
}
