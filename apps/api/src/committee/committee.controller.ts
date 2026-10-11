import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { Role } from "../common/enums";
import { IsString } from "class-validator";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthUser, JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { PrismaService } from "../prisma/prisma.service";

class AssignCommitteeDto {
  @IsString()
  eventId!: string;
  @IsString()
  userId!: string;
  @IsString()
  position!: string;
}

@UseGuards(JwtAuthGuard)
@Controller("committee")
export class CommitteeController {
  constructor(private readonly prisma: PrismaService) {}

  @Roles(Role.SUPER_ADMIN, Role.ADMIN_EVENT)
  @UseGuards(RolesGuard)
  @Post()
  assign(@Body() dto: AssignCommitteeDto, @CurrentUser() actor: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const assignment = await tx.committeeAssignment.create({ data: dto });
      await tx.auditLog.create({
        data: { actorId: actor.sub, action: "committee.assigned", entityType: "CommitteeAssignment", entityId: assignment.id },
      });
      return assignment;
    });
  }

  @Get("event/:eventId")
  list(@Param("eventId") eventId: string) {
    return this.prisma.committeeAssignment.findMany({
      where: { eventId },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    });
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN_EVENT)
  @UseGuards(RolesGuard)
  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() actor: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const assignment = await tx.committeeAssignment.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          actorId: actor.sub,
          action: "committee.removed",
          entityType: "CommitteeAssignment",
          entityId: id,
        },
      });
      return assignment;
    });
  }
}
