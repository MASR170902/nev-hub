import { Body, Controller, Get, Param, Put, UseGuards } from "@nestjs/common";
import { Role } from "../common/enums";
import { IsString } from "class-validator";
import { AuthUser, JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { PrismaService } from "../prisma/prisma.service";

class UpdateSettingDto {
  @IsString()
  value!: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Controller("settings")
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.systemSetting.findMany({ orderBy: { key: "asc" } });
  }

  @Put(":key")
  async update(
    @Param("key") key: string,
    @Body() dto: UpdateSettingDto,
    @CurrentUser() user: AuthUser,
  ) {
    const setting = await this.prisma.systemSetting.upsert({
      where: { key },
      update: { value: dto.value, updatedById: user.sub },
      create: { key, value: dto.value, updatedById: user.sub },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId: user.sub,
        action: "setting.updated",
        entityType: "SystemSetting",
        entityId: key,
      },
    });
    return setting;
  }
}
