import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthUser } from "../types/auth-user.type";
import { AuthenticatedRequest } from "../types/authenticated-request.type";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  }
);
