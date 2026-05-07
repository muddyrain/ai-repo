import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { loadLangChainConfig } from '../config/load-langchain-config';
import { PrismaService } from '../prisma/prisma.service';
import { getDocumentEmbeddings } from './embedding.model';

type SimilaritySearchResult = {
  content: string;
  metadata: Prisma.JsonValue | null;
  score: number;
};

@Injectable()
export class SearchService {
  private readonly embeddings = getDocumentEmbeddings();
  private readonly defaultTopK = loadLangChainConfig().retrieval.topK;

  constructor(private readonly prisma: PrismaService) {}

  async similaritySearch(query: string, userId: string, topK?: number) {
    const queryVector = await this.embeddings.embedQuery(query);
    const limit = Math.max(1, topK ?? this.defaultTopK);

    return this.prisma.$queryRaw<SimilaritySearchResult[]>(Prisma.sql`
      SELECT
        dc."content" AS "content",
        dc."metadata" AS "metadata",
        1 - (dc."embedding" <=> ${JSON.stringify(queryVector)}::vector) AS "score"
      FROM "DocumentChunk" dc
      INNER JOIN "Document" d ON d."id" = dc."documentId"
      WHERE d."userId" = ${userId}
        AND d."status" = 'completed'
        AND dc."embedding" IS NOT NULL
      ORDER BY dc."embedding" <=> ${JSON.stringify(queryVector)}::vector
      LIMIT ${limit}
    `);
  }
}