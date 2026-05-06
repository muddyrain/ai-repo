import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { MessageService } from '../src/conversation/message.service';

describe('MessageService', () => {
  it('should persist a message and touch the conversation timestamp', async () => {
    const prisma = {
      message: {
        create: jest.fn().mockResolvedValue(undefined),
      },
      conversation: {
        update: jest.fn().mockResolvedValue(undefined),
      },
    };

    const service = new MessageService(prisma as any);

    await service.addMessage('conv-1', 'human', '你好', { source: 'web' });

    expect(prisma.message.create).toHaveBeenCalledWith({
      data: {
        conversationId: 'conv-1',
        role: 'human',
        content: '你好',
        metadata: { source: 'web' },
      },
    });
    expect(prisma.conversation.update).toHaveBeenCalledWith({
      where: { id: 'conv-1' },
      data: { updatedAt: expect.any(Date) },
    });
  });

  it('should map postgres history into LangChain messages', async () => {
    const prisma = {
      message: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([
          {
            role: 'system',
            content: '系统提示',
            metadata: null,
            createdAt: new Date('2026-05-06T10:00:00.000Z'),
          },
          {
            role: 'human',
            content: '用户问题',
            metadata: null,
            createdAt: new Date('2026-05-06T10:01:00.000Z'),
          },
          {
            role: 'ai',
            content: '助手回答',
            metadata: null,
            createdAt: new Date('2026-05-06T10:02:00.000Z'),
          },
          {
            role: 'tool',
            content: '工具输出',
            metadata: { tool_call_id: 'tool-1' },
            createdAt: new Date('2026-05-06T10:03:00.000Z'),
          },
        ]),
      },
      conversation: {
        update: jest.fn(),
      },
    };

    const service = new MessageService(prisma as any);
    const history = await service.getHistoryAsLangChainMessages('conv-1');

    expect(prisma.message.findMany).toHaveBeenCalledWith({
      where: { conversationId: 'conv-1' },
      orderBy: { createdAt: 'asc' },
    });
    expect(history).toHaveLength(4);
    expect(history[0]).toBeInstanceOf(SystemMessage);
    expect(history[1]).toBeInstanceOf(HumanMessage);
    expect(history[2]).toBeInstanceOf(AIMessage);
    expect(history[3]).toBeInstanceOf(ToolMessage);
    expect((history[3] as ToolMessage).lc_kwargs.tool_call_id).toBe('tool-1');
  });
});
