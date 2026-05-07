import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ChunkService } from './chunk.service';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [DocumentController],
  providers: [
    DocumentService,
    ChunkService,
  ],
  exports: [DocumentService, ChunkService],
})
export class DocumentModule {}
