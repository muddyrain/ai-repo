import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from '../embedding/embedding.service';
import { SseService } from '../sse/sse.service';
import { parseFile } from './parsers/parser.factory';
import path from 'path';
import { randomUUID } from 'node:crypto';
import { getUploadDir } from './utils';

const VECTOR_DIMENSION = 384;
const ZERO_VECTOR = `[${Array.from({ length: VECTOR_DIMENSION }, () => 0).join(',')}]`;

@Injectable()
export class ChunkService {
  private readonly splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
    private readonly sseService: SseService,
  ) { }

  async chunkDocument(documentId: string) {
    const doc = await this.prisma.document.findUniqueOrThrow({
      where: { id: documentId },
    });

    // 更新状态
    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: 'processing' },
    });
    try {
      // 1. 解析文件
      const text = await parseFile(path.join(getUploadDir(), doc.filename), doc.mimeType);
      // 2. 分块
      const chunks = await this.splitter.splitText(text);

      const metadata = chunks.map((_, index) => ({
        chunkIndex: index,
        documentId,
      }));

      // 3. 写入数据库
      const insertRows = chunks.map((content, index) => Prisma.sql`
        (${randomUUID()}, ${documentId}, ${content}, ${index}, ${JSON.stringify(metadata[index])}::jsonb, ${ZERO_VECTOR}::vector)
      `);

      await this.prisma.$transaction([
        this.prisma.documentChunk.deleteMany({
          where: { documentId },
        }),
        ...(insertRows.length > 0
          ? [
            this.prisma.$executeRaw`
                INSERT INTO "DocumentChunk" ("id", "documentId", "content", "chunkIndex", "metadata", "embedding")
                VALUES ${Prisma.join(insertRows)}
              `,
          ]
          : []),
      ]);


      // 4. 更新文档状态
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'processing',
          chunkCount: chunks.length,
        },
      });

      return { chunkCount: chunks.length };
    } catch (error) {
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'failed' },
      });
      throw error;
    }
  }

  async processDocument(userId: string, documentId: string) {
    this.sseService.emit(userId, {
      id: randomUUID(),
      taskType: 'document_vectorize',
      taskId: documentId,
      status: 'processing',
      message: '文档正在解析和向量化...',
      createdAt: new Date().toISOString(),
    });

    try {
      const { chunkCount } = await this.chunkDocument(documentId);
      await this.embeddingService.embedChunks(documentId);

      this.sseService.emit(userId, {
        id: randomUUID(),
        taskType: 'document_vectorize',
        taskId: documentId,
        status: 'done',
        message: `向量化完成，共 ${chunkCount} 个分块`,
        metadata: { chunkCount },
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '文档向量化失败';

      this.sseService.emit(userId, {
        id: randomUUID(),
        taskType: 'document_vectorize',
        taskId: documentId,
        status: 'error',
        message,
        createdAt: new Date().toISOString(),
      });
      throw error;
    }
  }
}
