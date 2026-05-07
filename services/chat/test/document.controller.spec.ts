import { GUARDS_METADATA } from '@nestjs/common/constants';
import { DocumentController } from '../src/document/document.controller';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';

describe('DocumentController', () => {
  it('should enforce JwtAuthGuard on all document routes', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, DocumentController);

    expect(guards).toEqual([JwtAuthGuard]);
  });

  it('should pass user id and uploaded file into the service', async () => {
    const documentService = {
      upload: jest.fn().mockResolvedValue({ id: 'doc-1' }),
      findByUser: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue({ id: 'doc-1' }),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const controller = new DocumentController(documentService as any);
    const req = { user: { userId: 'user-1' } };
    const file = { originalname: 'demo.txt' } as Express.Multer.File;

    await controller.upload(req as any, file);
    await controller.list(req as any);
    await controller.detail('doc-1', req as any);
    await controller.remove('doc-1', req as any);

    expect(documentService.upload).toHaveBeenCalledWith('user-1', file);
    expect(documentService.findByUser).toHaveBeenCalledWith('user-1');
    expect(documentService.findById).toHaveBeenCalledWith('doc-1', 'user-1');
    expect(documentService.delete).toHaveBeenCalledWith('doc-1', 'user-1');
  });
});
