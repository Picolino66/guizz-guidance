import { createParamDecorator, ExecutionContext } from "@nestjs/common"
import { RhAuthPayload } from "./rh-auth.guard"

export const CurrentRhUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): RhAuthPayload => {
  const request = ctx.switchToHttp().getRequest()
  return request.rhUser
})
