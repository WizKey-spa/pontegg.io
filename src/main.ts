import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

import { AppModule } from './app.module';
import AWS from 'aws-sdk';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  // app.useLogger(app.get(Logger));
  app.setGlobalPrefix('v1');

  const sts = new AWS.STS();

  sts.getCallerIdentity((err, data) => {
    console.log(data);
  });

  const config = new DocumentBuilder()
    .setTitle('Wizkey Bellerofonte API')
    .setDescription('This document describes API and DTOs available in Bellerofonte Platform')
    .setVersion('1.0')
    // .addTag('bellerofonte')
    // .setBasePath('../shared/dist/resources/')

    .addServer('../shared/dist/resources/')
    .addBearerAuth({
      type: 'apiKey',
      name: 'Authorization',
      in: 'header',
      description:
        'An OIDC token obtained via the auth service. This token must be refreshed using the provided refresh token',
    })
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    // ignoreGlobalPrefix: true,
  });
  SwaggerModule.setup('api', app, document);
  const port = app.get(ConfigService).get('PORT');
  await app.listen(port);
  Logger.log(`Listening attentively on port ${port}`);
}
bootstrap();
