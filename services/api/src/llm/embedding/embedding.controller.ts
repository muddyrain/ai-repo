import { Body, Controller, Post } from '@nestjs/common';
import { VectorStoreService } from './vector-store.service';

@Controller('api/embedding')
export class EmbeddingController {
  constructor(private readonly vectorStoreService: VectorStoreService) { }

  @Post('store')
  async store(@Body() body: { documents: { content: string; metadata: Record<string, unknown> }[] }) {
    return this.vectorStoreService.addDocuments(body.documents);
  }

  @Post('search')
  async search(@Body() body: { query: string; topK?: number }) {
    return {
      results: await this.vectorStoreService.similaritySearch(
        body.query,
        body.topK ?? 3,
      ),
    };
  }
}
