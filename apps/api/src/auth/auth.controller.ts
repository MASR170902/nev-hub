import { Body, Controller, Get, Post, Put, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./current-user.decorator";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { AuthUser, JwtAuthGuard } from "./jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("login")
  login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.auth.login(dto, request.ip);
  }

  @Post("register")
  register(@Body() dto: RegisterDto, @Req() request: Request) {
    return this.auth.register(dto, request.ip);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Put("password")
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.sub, dto);
  }
}
