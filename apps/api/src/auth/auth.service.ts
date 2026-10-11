import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { Role } from "../common/enums";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "./jwt-auth.guard";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto, ipAddress?: string) {
    const identifier = dto.email.toLowerCase().trim();
    let user = await this.prisma.user.findUnique({ where: { email: identifier } });
    if (!user) {
      user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email: { startsWith: identifier + "@" } },
            { name: { equals: identifier } },
          ],
        },
      });
    }
    if (!user || !user.active || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("Email/username atau password tidak sesuai.");
    }
    const payload: AuthUser = {
      sub: user.id,
      email: user.email,
      role: user.role as Role,
      tokenVersion: user.tokenVersion,
    };
    const accessToken = await this.jwt.signAsync(payload);
    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "auth.login",
        entityType: "User",
        entityId: user.id,
        ipAddress,
      },
    });
    return {
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role as Role },
    };
  }

  async me(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, active: true },
    });
    if (!user?.active) throw new UnauthorizedException("Akun tidak aktif.");
    return { ...user, role: user.role as Role };
  }

  async changePassword(id: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || !(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new BadRequestException("Password saat ini tidak sesuai.");
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    });
    await this.prisma.auditLog.create({
      data: { actorId: id, action: "auth.password_changed", entityType: "User", entityId: id },
    });
    return { message: "Password berhasil diperbarui." };
  }

  async register(dto: RegisterDto, ipAddress?: string) {
    let email = dto.email.toLowerCase().trim();
    if (!email.includes("@")) {
      email = `${email}@nevhub.local`;
    }
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException("Email atau identitas tersebut sudah terdaftar. Silakan langsung login.");
    }
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        passwordHash,
        role: Role.PARTICIPANT,
        active: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "auth.registered",
        entityType: "User",
        entityId: user.id,
        ipAddress,
      },
    });

    const payload: AuthUser = {
      sub: user.id,
      email: user.email,
      role: Role.PARTICIPANT,
      tokenVersion: user.tokenVersion,
    };
    const accessToken = await this.jwt.signAsync(payload);

    return {
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: Role.PARTICIPANT },
    };
  }
}
