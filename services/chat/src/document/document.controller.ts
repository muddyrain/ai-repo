import {
  Controller, Post, Get,
  UseInterceptors, UploadedFile, Req,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentService } from './document.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import type { AuthenticatedRequest } from 'src/auth/type';

@UseGuards(JwtAuthGuard)
@Controller('api/documents')
export class DocumentController {
  constructor(private documentService: DocumentService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.userId; // 从 JWT Guard 中获取
    return this.documentService.upload(userId, file);
  }

  @Get()
  async list(@Req() req: AuthenticatedRequest) {
    return this.documentService.findByUser(req.user.userId);
  }
}
