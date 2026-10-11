import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { Role } from "../common/enums";
import { IsBoolean, IsEmail, IsEnum, IsString, MinLength } from "class-validator";
import * as bcrypt from "bcrypt";
import { AuthUser, JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { PrismaService } from "../prisma/prisma.service";

class CreateAccountDto {
  @IsString()
  name!: string;
  @IsEmail()
  email!: string;
  @IsString()
  @MinLength(12)
  password!: string;
  @IsEnum(Role)
  role!: Role;
}

class UpdateAccountDto {
  @IsEnum(Role)
  role!: Role;
  @IsBoolean()
  active!: boolean;
}

class ResetPasswordDto {
  @IsString()
  @MinLength(12)
  newPassword!: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Controller("accounts")
export class AccountsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      orderBy: { name: "asc" },
    });
  }

  @Post()
  async create(@Body() dto: CreateAccountDto, @CurrentUser() actor: AuthUser) {
    const account = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email: dto.email.toLowerCase().trim(),
        passwordHash: await bcrypt.hash(dto.password, 12),
        role: dto.role,
      },
      select: { id: true, name: true, email: true, role: true, active: true },
    });
    await this.prisma.auditLog.create({
      data: { actorId: actor.sub, action: "account.created", entityType: "User", entityId: account.id },
    });
    return account;
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateAccountDto, @CurrentUser() actor: AuthUser) {
    if (actor.sub === id && (!dto.active || dto.role !== Role.SUPER_ADMIN)) {
      throw new ForbiddenException("Super Admin tidak dapat menurunkan role atau menonaktifkan akunnya sendiri.");
    }
    const account = await this.prisma.user.update({
      where: { id },
      data: { role: dto.role, active: dto.active, tokenVersion: { increment: 1 } },
      select: { id: true, name: true, email: true, role: true, active: true },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: actor.sub,
        action: "account.updated",
        entityType: "User",
        entityId: id,
        details: JSON.stringify({ role: dto.role, active: dto.active }),
      },
    });
    return account;
  }

  @Post(":id/reset-password")
  async resetPassword(
    @Param("id") id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() actor: AuthUser,
  ) {
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: actor.sub,
        action: "account.password_reset",
        entityType: "User",
        entityId: id,
      },
    });
    return { message: "Password baru tersimpan dengan hash bcrypt." };
  }
}
