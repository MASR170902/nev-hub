import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Role } from "../common/enums";
import { PrismaService } from "../prisma/prisma.service";

export interface AuthUser {
  sub: string;
  email: string;
  role: Role;
  tokenVersion: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: AuthUser;
    }>();
    const [scheme, token] = request.headers.authorization?.split(" ") ?? [];
    if (scheme !== "Bearer" || !token) {
      throw new UnauthorizedException("Silakan login untuk melanjutkan.");
    }
    try {
      const payload = await this.jwt.verifyAsync<AuthUser>(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, role: true, active: true, tokenVersion: true },
      });
      if (!user?.active) throw new UnauthorizedException("Akun tidak aktif.");
      if (payload.tokenVersion !== user.tokenVersion) {
        throw new UnauthorizedException("Password atau sesi berubah. Silakan login kembali.");
      }
      request.user = {
        sub: user.id,
        email: user.email,
        role: user.role as Role,
        tokenVersion: user.tokenVersion,
      };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException("Sesi tidak valid atau sudah kedaluwarsa.");
    }
  }
}
