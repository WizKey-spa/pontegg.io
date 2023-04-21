import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ObjId = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  // ObjectId.isValid(customerId);
  return request;
});
