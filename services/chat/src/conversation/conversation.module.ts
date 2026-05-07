import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EmbeddingModule } from '../embedding/embedding.module';
import { AdvancedAnalysisService } from '../llm/advanced-analysis.service';
import { OrchestratorService } from '../llm/agents/orchestrator.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { MessageService } from './message.service';

@Module({
  imports: [AuthModule, PrismaModule, EmbeddingModule],
  providers: [
    ConversationService,
    MessageService,
    AdvancedAnalysisService,
    OrchestratorService,
  ],
  controllers: [ConversationController],
  exports: [ConversationService, MessageService, AdvancedAnalysisService],
})
export class ConversationModule { }
