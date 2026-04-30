import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Injectable } from '@nestjs/common';
import { Document } from '@langchain/core/documents';
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
import { EmbeddingService } from './embedding.service';

type VectorStoreDocumentInput = {
  content: string;
  metadata: Record<string, unknown>;
};

const INITIAL_DOCUMENT_PATHS = [
  'policies/return-policy.md',
  'policies/refund-policy.md',
  'faq/after-sale-faq.md',
];

@Injectable()
export class VectorStoreService {
  private readonly workspaceRoot = resolve(process.cwd(), 'workspace');
  private readonly store: MemoryVectorStore;
  private seedPromise?: Promise<void>;

  constructor(private readonly embeddingService: EmbeddingService) {
    this.store = new MemoryVectorStore(this.embeddingService.getEmbeddings());
  }

  async addDocuments(docs: VectorStoreDocumentInput[]) {
    await this.ensureSeeded();
    const documents = docs.map(
      (doc) => new Document({ pageContent: doc.content, metadata: doc.metadata }),
    );
    await this.store.addDocuments(documents);
    return { added: documents.length };
  }

  async similaritySearch(query: string, topK = 3) {
    await this.ensureSeeded();
    return this.store.similaritySearch(query, topK);
  }

  private ensureSeeded() {
    if (!this.seedPromise) {
      this.seedPromise = this.seedInitialDocuments();
    }

    return this.seedPromise;
  }

  private async seedInitialDocuments() {
    const documents = await Promise.all(
      INITIAL_DOCUMENT_PATHS.map(async (relativePath) => {
        const content = await readFile(
          resolve(this.workspaceRoot, relativePath),
          'utf8',
        );

        return new Document({
          pageContent: content,
          metadata: {
            source: relativePath,
          },
        });
      }),
    );

    await this.store.addDocuments(documents);
  }
}
