import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthUser } from "./jwt-auth.guard";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser =>
    context.switchToHttp().getRequest<{ user: AuthUser }>().user,
);
