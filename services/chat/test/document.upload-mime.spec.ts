import { mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DocumentService } from '../src/document/document.service';

describe('DocumentService upload mime fallback', () => {
  it('accepts markdown files uploaded as application/octet-stream', async () => {
    const rootDir = join(
      tmpdir(),
      `chat-doc-mime-${Date.now()}-${Math.random().toString(16).slice(2)}`,
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
    const service = new DocumentService(prisma as any);

    const originalCwd = process.cwd();
    const originalNow = Date.now;
    process.chdir(rootDir);
    Date.now = () => 1700000000000;

    try {
      const result = await service.upload('user-1', {
        originalname: 'notes.md',
        mimetype: 'application/octet-stream',
        size: 7,
        buffer: Buffer.from('# hello', 'utf8'),
      } as Express.Multer.File);

      expect(result).toMatchObject({
        id: 'doc-1',
        userId: 'user-1',
        originalName: 'notes.md',
        mimeType: 'text/markdown',
        size: 7,
        status: 'pending',
        filename: 'user-1/1700000000000-notes.md',
      });
      expect(prisma.document.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          filename: 'user-1/1700000000000-notes.md',
          originalName: 'notes.md',
          mimeType: 'text/markdown',
          size: 7,
          status: 'pending',
        },
      });

      const savedFile = join(rootDir, 'uploads/user-1/1700000000000-notes.md');
      expect(await readFile(savedFile, 'utf8')).toBe('# hello');
    } finally {
      Date.now = originalNow;
      process.chdir(originalCwd);
    }
  });
});
