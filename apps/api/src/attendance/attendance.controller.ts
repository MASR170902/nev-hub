import { BadRequestException, Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { AttendanceStatus, Role } from "../common/enums";
import { IsEnum, IsString } from "class-validator";
import { AuthUser, JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { PrismaService } from "../prisma/prisma.service";

class CheckInDto {
  @IsString()
  registrationId!: string;
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus = AttendanceStatus.PRESENT;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ATTENDANCE_OFFICER)
@Controller("attendance")
export class AttendanceController {
  constructor(private readonly prisma: PrismaService) {}

  @Post("check-in")
  async checkIn(@Body() dto: CheckInDto, @CurrentUser() user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const registration = await tx.registration.findUnique({ where: { id: dto.registrationId } });
      if (!registration || registration.status !== "APPROVED") {
        throw new BadRequestException("Peserta belum disetujui atau pendaftaran tidak ditemukan.");
      }
      const record = await tx.attendance.create({
        data: {
          eventId: registration.eventId,
          registrationId: registration.id,
          markedById: user.sub,
          status: dto.status,
        },
      });
      await tx.auditLog.create({
        data: { actorId: user.sub, action: "attendance.checked_in", entityType: "Attendance", entityId: record.id },
      });
      return record;
    });
  }

  @Get()
  list() {
    return this.prisma.attendance.findMany({
      include: { event: { select: { title: true } }, registration: { include: { user: { select: { name: true, email: true } } } } },
      orderBy: { checkedInAt: "desc" },
    });
  }
}
