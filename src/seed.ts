import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SeedService } from './seed/seed.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const seed = app.get(SeedService);
  await seed.run();

  await app.close();
}

bootstrap();
