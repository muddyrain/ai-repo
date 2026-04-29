import { Module } from '@nestjs/common';
import { LlmController } from './llm.controller';
import { LlmService } from './llm.service';
import { RequirementService } from './requirement.service';
import { MemoryController } from './memory/memory.controller';
import { RunnableMemoryService } from './memory/runnable-memory.service';
import { FilesystemController } from './filesystem/filesystem.controller';
import { FilesystemService } from './filesystem/filesystem.service';

@Module({
  controllers: [LlmController, MemoryController, FilesystemController],
  providers: [
    LlmService,
    RequirementService,
    RunnableMemoryService,
    FilesystemService,
  ],
  exports: [
    LlmService,
    RequirementService,
    RunnableMemoryService,
    FilesystemService,
  ],
})
export class LlmModule {}
