import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EmbeddingService } from './embedding.service';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [SearchController],
  providers: [EmbeddingService, SearchService],
  exports: [EmbeddingService, SearchService],
})
export class EmbeddingModule {}