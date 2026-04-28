import { Controller, Post, Res } from '@nestjs/common';
import { LlmService } from './llm.service';

@Controller('api/langchain')
export class LlmController {
  constructor(private readonly llmService: LlmService) { }

  @Post('invoke')
  async invoke() {
    return this.llmService.invoke();
  }

  @Post('stream')
  async stream(@Res() res: any) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    for await (const chunk of this.llmService.stream()) {
      res.write(chunk);
    }

    res.end();
  }

  @Post('batch')
  async batch() {
    return this.llmService.batch();
  }
}
