import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { RunnableMemoryService } from './runnable-memory.service';

type SessionBody = {
  sessionId?: string;
};

type ChatBody = SessionBody & {
  input?: string;
};

@Controller('api/memory')
export class MemoryController {
  constructor(private readonly memoryService: RunnableMemoryService) {}

  @Post('chat')
  async chat(@Body() body: ChatBody) {
    const sessionId = this.requireString(body.sessionId, 'sessionId');
    const input = this.requireString(body.input, 'input');
    const result = await this.memoryService.chat(sessionId, input);

    return { sessionId, result };
  }

  @Get('history')
  async history(
    @Query('sessionId') querySessionId?: string,
    @Body() body?: SessionBody,
  ) {
    const sessionId = this.requireString(
      querySessionId ?? body?.sessionId,
      'sessionId',
    );
    const history = await this.memoryService.getHistory(sessionId);

    return { sessionId, history };
  }

  @Delete('clear')
  async clear(
    @Query('sessionId') querySessionId?: string,
    @Body() body?: SessionBody,
  ) {
    const sessionId = this.requireString(
      querySessionId ?? body?.sessionId,
      'sessionId',
    );
    await this.memoryService.clearSession(sessionId);

    return { sessionId, cleared: true };
  }

  private requireString(value: unknown, field: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${field} is required`);
    }

    return value.trim();
  }
}
