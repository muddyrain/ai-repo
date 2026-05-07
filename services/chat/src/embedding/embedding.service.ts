import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getDocumentEmbeddings } from './embedding.model';

@Injectable()
export class EmbeddingService {
  private readonly embeddings = getDocumentEmbeddings();

  constructor(private readonly prisma: PrismaService) {}

  async embedChunks(documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { _count: { select: { chunks: true } } },
    });

    if (!document) {
      return null;
    }

    const chunks = await this.prisma.documentChunk.findMany({
      where: { documentId },
      orderBy: { chunkIndex: 'asc' },
      select: { id: true, content: true },
    });

    try {
      if (chunks.length === 0) {
        return this.prisma.document.update({
          where: { id: documentId },
          data: {
            status: 'completed',
          },
          include: { _count: { select: { chunks: true } } },
        });
      }

      const vectors = await this.embeddings.embedDocuments(
        chunks.map((chunk) => chunk.content),
      );

      const valueRows = chunks.map((chunk, index) => Prisma.sql`
        (${chunk.id}, ${JSON.stringify(vectors[index])}::vector)
      `);

      await this.prisma.$transaction([
        this.prisma.$executeRaw`
          UPDATE "DocumentChunk" AS dc
          SET "embedding" = v.embedding
          FROM (VALUES ${Prisma.join(valueRows)}) AS v("id", embedding)
          WHERE dc."id" = v."id"
        `,
        this.prisma.document.update({
          where: { id: documentId },
          data: {
            status: 'completed',
          },
        }),
      ]);

      return this.prisma.document.findUnique({
        where: { id: documentId },
        include: { _count: { select: { chunks: true } } },
      });
    } catch (error) {
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'failed',
        },
      });
      throw error;
    }
  }
}