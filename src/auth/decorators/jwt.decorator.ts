import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ExtractJwt } from 'passport-jwt';

export const Jwt = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
  return {
    ...request.user,
    token,
  };
});
