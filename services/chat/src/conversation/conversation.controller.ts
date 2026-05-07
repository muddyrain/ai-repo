import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdvancedAnalysisService } from '../llm/advanced-analysis.service';
import { MessageService } from './message.service';
import { ConversationService } from './conversation.service';
import type { AuthenticatedRequest } from 'src/auth/type';



type CreateConversationBody = {
  title?: string;
};

type ChatBody = {
  input?: string;
};

@UseGuards(JwtAuthGuard)
@Controller('api/conversations')
export class ConversationController {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageService,
    private readonly advancedAnalysisService: AdvancedAnalysisService,
  ) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() body: CreateConversationBody) {
    return this.conversationService.create(req.user.userId, body?.title);
  }

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.conversationService.findByUser(req.user.userId);
  }

  @Get(':id/messages')
  async messages(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
  ) {
    await this.conversationService.findById(id, req.user.userId);

    return {
      conversationId: id,
      messages: await this.messageService.getHistory(id, this.parseLimit(limit)),
    };
  }

  @Post(':id/chat')
  async chat(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: ChatBody,
  ) {
    const input = this.requireString(body?.input, 'input');
    await this.conversationService.findById(id, req.user.userId);
    const analysis = await this.advancedAnalysisService.analyze(
      req.user.userId,
      id,
      input,
    );

    console.log("analysis",analysis);
    return {
      conversationId: id,
      report: analysis.report,
      status: analysis.status,
      clarificationQuestions: analysis.clarificationQuestions ?? [],
      usedAgents: analysis.usedAgents,
      retrievedDocuments: analysis.retrievedDocuments,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    await this.conversationService.delete(id, req.user.userId);

    return {
      conversationId: id,
      deleted: true,
    };
  }

  private requireString(value: unknown, field: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${field} is required`);
    }

    return value.trim();
  }

  private parseLimit(value?: string) {
    if (!value) {
      return undefined;
    }

    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new BadRequestException('limit must be a positive integer');
    }

    return parsed;
  }
}
