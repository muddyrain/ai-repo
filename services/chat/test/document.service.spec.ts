import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ForbiddenException, UnsupportedMediaTypeException } from '@nestjs/common';
import { DocumentService } from '../src/document/document.service';

describe('DocumentService', () => {
  it('should save the file under uploads/userId and persist metadata', async () => {
    const rootDir = join(
      tmpdir(),
      `chat-doc-upload-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    );
    await mkdir(rootDir, { recursive: true });

    const prisma = {
      document: {
        create: jest.fn().mockImplementation(async ({ data }) => ({
          id: 'doc-1',
          ...data,
        })),
      },
    };
    const service = new DocumentService(prisma as any, rootDir);

    const originalNow = Date.now;
    Date.now = () => 1700000000000;

    const result = await service.upload('user-1', {
      originalname: 'notes.md',
      mimetype: 'text/markdown',
      size: 11,
      buffer: Buffer.from('# hello', 'utf8'),
    } as Express.Multer.File);

    Date.now = originalNow;

    expect(result).toMatchObject({
      id: 'doc-1',
      userId: 'user-1',
      originalName: 'notes.md',
      mimeType: 'text/markdown',
      size: 11,
      status: 'pending',
      chunkCount: 0,
      filename: 'uploads/user-1/1700000000000-notes.md',
    });
    expect(prisma.document.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        filename: 'uploads/user-1/1700000000000-notes.md',
        originalName: 'notes.md',
        mimeType: 'text/markdown',
        size: 11,
        status: 'pending',
        chunkCount: 0,
      },
    });

    const savedFile = join(rootDir, 'uploads/user-1/1700000000000-notes.md');
    expect((await readFile(savedFile, 'utf8'))).toBe('# hello');
  });

  it('should reject unsupported mime types', async () => {
    const prisma = {
      document: {
        create: jest.fn(),
      },
    };
    const service = new DocumentService(prisma as any, tmpdir());

    await expect(
      service.upload('user-1', {
        originalname: 'image.png',
        mimetype: 'image/png',
        size: 4,
        buffer: Buffer.from([1, 2, 3, 4]),
      } as Express.Multer.File),
    ).rejects.toThrow(UnsupportedMediaTypeException);
    expect(prisma.document.create).not.toHaveBeenCalled();
  });

  it('should enforce ownership and remove the physical file on delete', async () => {
    const rootDir = join(
      tmpdir(),
      `chat-doc-delete-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    );
    const filePath = join(rootDir, 'uploads/user-1/1700000000000-file.txt');
    await mkdir(join(rootDir, 'uploads/user-1'), { recursive: true });
    await writeFile(filePath, 'to delete', 'utf8');

    const prisma = {
      document: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({
            id: 'doc-1',
            userId: 'user-1',
            filename: 'uploads/user-1/1700000000000-file.txt',
          })
          .mockResolvedValueOnce({
            id: 'doc-2',
            userId: 'other-user',
            filename: 'uploads/other-user/file.txt',
          }),
        delete: jest.fn().mockResolvedValue({ id: 'doc-1' }),
      },
    };
    const service = new DocumentService(prisma as any, rootDir);

    await service.delete('doc-1', 'user-1');
    await expect(stat(filePath)).rejects.toThrow();
    expect(prisma.document.delete).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
    });

    await expect(service.findById('doc-2', 'user-1')).rejects.toThrow(
      ForbiddenException,
    );
  });
});
