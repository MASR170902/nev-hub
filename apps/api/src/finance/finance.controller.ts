import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { FinanceType, Role } from "../common/enums";
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { Type } from "class-transformer";
import { AuthUser, JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { PrismaService } from "../prisma/prisma.service";

class CreateTransactionDto {
  @IsOptional()
  @IsString()
  eventId?: string;
  @IsEnum(FinanceType)
  type!: FinanceType;
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;
  @IsString()
  description!: string;
  @IsOptional()
  @IsString()
  reference?: string;
  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.TREASURER)
@Controller("finance")
export class FinanceController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("transactions")
  transactions() {
    return this.prisma.financeTransaction.findMany({
      include: { event: { select: { title: true } }, createdBy: { select: { name: true } } },
      orderBy: { occurredAt: "desc" },
    });
  }

  @Post("transactions")
  create(@Body() dto: CreateTransactionDto, @CurrentUser() user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.financeTransaction.create({
        data: {
          ...dto,
          amount: dto.amount,
          occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
          createdById: user.sub,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.sub,
          action: "finance.transaction_created",
          entityType: "FinanceTransaction",
          entityId: transaction.id,
          details: JSON.stringify({ type: transaction.type, amount: transaction.amount.toString() }),
        },
      });
      return transaction;
    });
  }
}
