import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as bcrypt from 'bcryptjs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  //bech naamel hash lle password mta3 admin bech ndakhlou fl base
  const hash = await bcrypt.hash('admin123', 10);
  console.log('ADMIN HASH:', hash);

  app.enableCors({
    origin: 'http://localhost:3000', // ← Next.js frontend
    credentials: true,
    exposedHeaders: ['Content-Disposition'],  // needed for filename in browser
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
   app.enableCors(); 

  //documentation
const swagger = new DocumentBuilder()
.setTitle("Plateforme BI")
.setDescription("API description")
.setVersion("1.0")
.build()


const documentation = SwaggerModule.createDocument(app, swagger);
// http://localhost:5000/swagger
SwaggerModule.setup("swagger", app , documentation);

  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();