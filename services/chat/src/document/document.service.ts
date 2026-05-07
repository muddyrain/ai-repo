import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ALLOWED_MIME_TYPES = [
  'text/plain',
  'text/markdown',
  'application/pdf',
];
const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.markdown': 'text/markdown',
  '.pdf': 'application/pdf',
};
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function resolveAllowedMimeType(file: Express.Multer.File) {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return file.mimetype;
  }

  return MIME_TYPE_BY_EXTENSION[path.extname(file.originalname).toLowerCase()] ?? null;
}

function getUploadDir() {
  return path.join(process.cwd(), 'uploads');
}

@Injectable()
export class DocumentService {
  constructor(private prisma: PrismaService) {}

  async upload(userId: string, file: Express.Multer.File) {
    const resolvedMimeType = resolveAllowedMimeType(file);

    // 校验
    if (!resolvedMimeType) {
      throw new BadRequestException(
        `不支持的文件类型: ${file.mimetype}，仅支持 TXT/MD/PDF`
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('文件大小不能超过 10MB');
    }

    // 存储
    const userDir = path.join(getUploadDir(), userId);
    fs.mkdirSync(userDir, { recursive: true });

    const filename = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(userDir, filename);
    fs.writeFileSync(filePath, file.buffer);

    // 元数据入库
    return this.prisma.document.create({
      data: {
        userId,
        filename: `${userId}/${filename}`,
        originalName: file.originalname,
        mimeType: resolvedMimeType,
        size: file.size,
        status: 'pending',
      },
    });
  }

  async findByUser(userId: string) {
    return this.prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { chunks: true } } },
    });
  }
}
