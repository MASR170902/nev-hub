import { BadRequestException, Body, Controller, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { RegistrationStatus, Role } from "../common/enums";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { AuthUser, JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { PrismaService } from "../prisma/prisma.service";

class RegisterDto {
  @IsString()
  eventId!: string;
}

class ReviewRegistrationDto {
  @IsEnum(RegistrationStatus)
  status!: RegistrationStatus;
  @IsOptional()
  @IsString()
  note?: string;
}

@UseGuards(JwtAuthGuard)
@Controller("registrations")
export class RegistrationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("mine")
  mine(@CurrentUser() user: AuthUser) {
    return this.prisma.registration.findMany({
      where: { userId: user.sub },
      include: { event: true, certificate: true, attendance: true },
      orderBy: { registeredAt: "desc" },
    });
  }

  @Post()
  async register(@CurrentUser() user: AuthUser, @Body() dto: RegisterDto) {
    const event = await this.prisma.event.findUnique({ where: { id: dto.eventId } });
    if (!event || event.status !== "PUBLISHED") {
      throw new BadRequestException("Agenda belum dibuka untuk pendaftaran.");
    }
    return this.prisma.$transaction(async (tx) => {
      if (event.capacity !== null) {
        const count = await tx.registration.count({
          where: { eventId: event.id, status: { in: ["PENDING", "APPROVED", "WAITLISTED"] } },
        });
        if (count >= event.capacity) throw new BadRequestException("Kuota agenda sudah penuh.");
      }
      return tx.registration.create({
        data: { eventId: event.id, userId: user.sub },
        include: { event: true },
      });
    });
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN_EVENT)
  @UseGuards(RolesGuard)
  @Get("event/:eventId")
  forEvent(@Param("eventId") eventId: string) {
    return this.prisma.registration.findMany({
      where: { eventId },
      include: { user: { select: { id: true, name: true, email: true } }, attendance: true },
      orderBy: { registeredAt: "asc" },
    });
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN_EVENT)
  @UseGuards(RolesGuard)
  @Put(":id/review")
  async review(@Param("id") id: string, @Body() dto: ReviewRegistrationDto, @CurrentUser() user: AuthUser) {
    if (dto.status === RegistrationStatus.CANCELLED) {
      throw new BadRequestException("Status pembatalan tidak dapat ditetapkan oleh proses seleksi.");
    }
    return this.prisma.$transaction(async (tx) => {
      const registration = await tx.registration.update({
        where: { id },
        data: { status: dto.status, note: dto.note },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.sub,
          action: "registration.reviewed",
          entityType: "Registration",
          entityId: id,
          details: JSON.stringify({ status: dto.status }),
        },
      });
      await tx.notification.create({
        data: {
          userId: registration.userId,
          title: "Status pendaftaran diperbarui",
          message: `Pendaftaran Anda berstatus ${dto.status}.`,
        },
      });
      return registration;
    });
  }
}
