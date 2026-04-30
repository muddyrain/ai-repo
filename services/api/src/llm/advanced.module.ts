import { Module } from '@nestjs/common';
import { RunnableMemoryService } from './memory/runnable-memory.service';
import { EmbeddingService } from './embedding/embedding.service';
import { VectorStoreService } from './embedding/vector-store.service';
import { FilesystemService } from './filesystem/filesystem.service';
import { OrchestratorService } from './agents/orchestrator.service';
import { AdvancedAnalysisService } from './advanced-analysis.service';
import { AdvancedController } from './advanced.controller';

@Module({
  controllers: [AdvancedController],
  providers: [
    RunnableMemoryService,
    EmbeddingService,
    VectorStoreService,
    FilesystemService,
    OrchestratorService,
    AdvancedAnalysisService,
  ],
  exports: [
    RunnableMemoryService,
    EmbeddingService,
    VectorStoreService,
    FilesystemService,
    OrchestratorService,
    AdvancedAnalysisService,
  ],
})
export class AdvancedModule {}
