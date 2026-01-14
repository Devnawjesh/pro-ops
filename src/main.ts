import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SeedService } from './seed/seed.service';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Optional: seed only when SEED=true
  if (process.env.SEED === 'true') {
    const seed = app.get(SeedService);
    await seed.run();
  }
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true,transformOptions: { enableImplicitConversion: false } }));

  // success formatter
  app.useGlobalInterceptors(new ResponseInterceptor());

  // error formatter
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
