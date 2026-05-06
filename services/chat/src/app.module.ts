import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { LlmModule } from './llm/llm.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    LlmModule,
    PrismaModule,
  ],
  controllers: [AppController],
})
export class AppModule { }
