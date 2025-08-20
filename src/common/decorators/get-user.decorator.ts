import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtUserPayload } from '../../auth/dto/jwt-user-payload.dto';

export const GetUser = createParamDecorator(
  (data: string, ctx: ExecutionContext): JwtUserPayload => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
