import { Body, Controller, Post, Res } from '@nestjs/common';
import { LlmService } from './llm.service';
import type { Response } from 'express';

@Controller('api/langchain')
export class LlmController {
  constructor(private readonly llmService: LlmService) { }

  @Post('invoke')
  async invoke(@Body() body: { input: string }) {
    const result = await this.llmService.invoke(body.input);
    return { result };
  }

  @Post('stream')
  async stream(@Body() body: { input: string }, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await this.llmService.streamDemo(body.input);

    for await (const chunk of stream) {
      res.write(chunk.content);
    }

    res.end();
  }

  @Post('batch')
  async batch(@Body() body: { inputs: string[] }) {
    const results = await this.llmService.batch(body.inputs);
    return { results };
  }

  @Post('prompt-preview')
  async promptPreview(@Body() body: { input: string }) {
    return this.llmService.promptPreview(body.input);
  }

  @Post('prompt-to-model')
  async promptToModel(@Body() body: { input: string }) {
    return this.llmService.promptToModel(body.input);
  }
}
