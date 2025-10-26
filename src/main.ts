import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  // Serve static front-end
  app.use(express.static(join(__dirname, '..', 'public')));

  await app.listen(3000, '0.0.0.0');
  console.log('Server started on http://localhost:3000');
}
bootstrap();
