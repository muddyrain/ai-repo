import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ConversationController } from '../src/conversation/conversation.controller';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';

describe('ConversationController', () => {
  it('should enforce JwtAuthGuard on all conversation routes', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, ConversationController);

    expect(guards).toEqual([JwtAuthGuard]);
  });

  it('should read user id from request context when creating and chatting', async () => {
    const conversationService = {
      create: jest.fn().mockResolvedValue({ id: 'conv-1' }),
      findByUser: jest.fn().mockResolvedValue([]),
      chat: jest.fn().mockResolvedValue('助手回复'),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const messageService = {
      getHistory: jest.fn().mockResolvedValue([]),
    };

    const controller = new ConversationController(
      conversationService as any,
      messageService as any,
    );
    const request = {
      user: {
        userId: 'user-1',
      },
    };

    await controller.create(request as any, { title: '会话标题' });
    await controller.chat('conv-1', request as any, { input: '你好' });

    expect(conversationService.create).toHaveBeenCalledWith('user-1', '会话标题');
    expect(conversationService.chat).toHaveBeenCalledWith(
      'conv-1',
      'user-1',
      '你好',
    );
  });
});
