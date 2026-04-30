import { Injectable } from '@nestjs/common';
import { Document } from '@langchain/core/documents';
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
import { EmbeddingService } from './embedding.service';

@Injectable()
export class VectorStoreService {
  private store: MemoryVectorStore;

  constructor(private embeddingService: EmbeddingService) {
    this.store = new MemoryVectorStore(this.embeddingService['embeddings']);
  }

  async addDocuments(
    docs: Array<{ content: string; metadata: Record<string, unknown> }>,
  ) {
    const documents = docs.map(
      (doc) => new Document({ pageContent: doc.content, metadata: doc.metadata }),
    );
    await this.store.addDocuments(documents);
    return { added: documents.length };
  }

  async similaritySearch(query: string, topK = 3) {
    return this.store.similaritySearch(query, topK);
  }
}
