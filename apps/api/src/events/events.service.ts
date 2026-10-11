import { Injectable, NotFoundException } from "@nestjs/common";
import { AuthUser } from "../auth/jwt-auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEventDto } from "./dto/create-event.dto";

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  private formatEvent<T extends { rundown?: string | null }>(event: T) {
    let parsedRundown: unknown = [];
    try {
      if (typeof event.rundown === "string") parsedRundown = JSON.parse(event.rundown);
      else if (event.rundown) parsedRundown = event.rundown;
    } catch {
      parsedRundown = [];
    }
    return { ...event, rundown: parsedRundown };
  }

  async list(participant: boolean) {
    const events = await this.prisma.event.findMany({
      where: participant ? { status: "PUBLISHED" } : {},
      orderBy: { startsAt: "asc" },
      include: { _count: { select: { registrations: true } } },
    });
    return events.map((event) => this.formatEvent(event));
  }

  async get(id: string, participant: boolean) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        committee: { include: { user: { select: { id: true, name: true, email: true } } } },
        _count: { select: { registrations: true } },
      },
    });
    if (!event || (participant && event.status !== "PUBLISHED")) {
      throw new NotFoundException("Agenda tidak ditemukan.");
    }
    return this.formatEvent(event);
  }

  async create(dto: CreateEventDto, actor: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const event = await tx.event.create({
        data: {
          ...dto,
          startsAt: new Date(dto.startsAt),
          endsAt: new Date(dto.endsAt),
          rundown: typeof dto.rundown === "string" ? dto.rundown : JSON.stringify(dto.rundown ?? []),
        },
      });
      await tx.auditLog.create({
        data: { actorId: actor.sub, action: "event.created", entityType: "Event", entityId: event.id },
      });
      if (event.status === "PUBLISHED") {
        await tx.notification.create({
          data: {
            title: "Agenda baru tersedia",
            message: `${event.title} telah dipublikasikan di NEVHub.`,
          },
        });
      }
      return this.formatEvent(event);
    });
  }

  async update(id: string, dto: CreateEventDto, actor: AuthUser) {
    await this.get(id, false);
    const { startsAt, endsAt, rundown, ...fields } = dto;
    const event = await this.prisma.event.update({
      where: { id },
      data: {
        ...fields,
        ...(startsAt ? { startsAt: new Date(startsAt) } : {}),
        ...(endsAt ? { endsAt: new Date(endsAt) } : {}),
        ...(rundown !== undefined ? { rundown: typeof rundown === "string" ? rundown : JSON.stringify(rundown) } : {}),
      },
    });
    await this.prisma.auditLog.create({
      data: { actorId: actor.sub, action: "event.updated", entityType: "Event", entityId: event.id },
    });
    return this.formatEvent(event);
  }

  async remove(id: string, actor: AuthUser) {
    await this.get(id, false);
    const event = await this.prisma.event.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    await this.prisma.auditLog.create({
      data: { actorId: actor.sub, action: "event.deleted", entityType: "Event", entityId: id },
    });
    return this.formatEvent(event);
  }
}
