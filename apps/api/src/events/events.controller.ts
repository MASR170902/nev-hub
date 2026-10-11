import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { Role } from "../common/enums";
import { AuthUser, JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CreateEventDto } from "./dto/create-event.dto";
import { EventsService } from "./events.service";

@UseGuards(JwtAuthGuard)
@Controller("events")
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.events.list(user.role === Role.PARTICIPANT);
  }

  @Get(":id")
  get(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.events.get(id, user.role === Role.PARTICIPANT);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN_EVENT)
  @UseGuards(RolesGuard)
  @Post()
  create(@Body() dto: CreateEventDto, @CurrentUser() user: AuthUser) {
    return this.events.create(dto, user);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN_EVENT)
  @UseGuards(RolesGuard)
  @Put(":id")
  update(@Param("id") id: string, @Body() dto: CreateEventDto, @CurrentUser() user: AuthUser) {
    return this.events.update(id, dto, user);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN_EVENT)
  @UseGuards(RolesGuard)
  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.events.remove(id, user);
  }
}
