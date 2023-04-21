import { Controller, Get, HttpCode } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

@Controller()
export class AppController {
  @Get('/healthcheck')
  @HttpCode(204)
  @ApiOperation({
    description: 'Healthcheck endpoint',
  })
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  healtcheck() {}
}
