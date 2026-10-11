import { BadRequestException, Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { Role } from "../common/enums";
import { IsString } from "class-validator";
import { AuthUser, JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { PrismaService } from "../prisma/prisma.service";

class IssueCertificateDto {
  @IsString()
  registrationId!: string;
  @IsString()
  serialNumber!: string;
}

@UseGuards(JwtAuthGuard)
@Controller("certificates")
export class CertificatesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.prisma.certificate.findMany({
      where: user.role === Role.PARTICIPANT ? { userId: user.sub } : {},
      include: { event: true, user: { select: { name: true, email: true } } },
      orderBy: { issuedAt: "desc" },
    });
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN_EVENT)
  @UseGuards(RolesGuard)
  @Post()
  async issue(@Body() dto: IssueCertificateDto, @CurrentUser() actor: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const registration = await tx.registration.findUnique({ where: { id: dto.registrationId } });
      if (!registration || registration.status !== "APPROVED") {
        throw new BadRequestException("Sertifikat hanya dapat diterbitkan kepada peserta yang disetujui.");
      }
      const certificate = await tx.certificate.create({
        data: {
          registrationId: registration.id,
          eventId: registration.eventId,
          userId: registration.userId,
          serialNumber: dto.serialNumber,
        },
      });
      await tx.notification.create({
        data: {
          userId: registration.userId,
          title: "Sertifikat tersedia",
          message: `Sertifikat kegiatan tersedia dengan nomor ${certificate.serialNumber}.`,
        },
      });
      await tx.auditLog.create({
        data: { actorId: actor.sub, action: "certificate.issued", entityType: "Certificate", entityId: certificate.id },
      });
      return certificate;
    });
  }
}
