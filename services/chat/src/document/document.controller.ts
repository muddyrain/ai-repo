import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/type';
import { EmbeddingService } from '../embedding/embedding.service';
import { ChunkService } from './chunk.service';
import { DocumentService } from './document.service';

@UseGuards(JwtAuthGuard)
@Controller('api/documents')
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly chunkService: ChunkService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.documentService.upload(req.user.userId, file);
  }

  @Get()
  async list(@Req() req: AuthenticatedRequest) {
    return this.documentService.findByUser(req.user.userId);
  }

  @Get(':id')
  async detail(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.documentService.findById(id, req.user.userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    await this.documentService.delete(id, req.user.userId);

    return {
      documentId: id,
      deleted: true,
    };
  }

  @Post(':id/process')
  async process(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user.userId;
    await this.documentService.findById(id, userId);
    await this.chunkService.chunkDocument(id);
    await this.embeddingService.embedChunks(id);
    return { message: '处理已完成', documentId: id };
  }
}
