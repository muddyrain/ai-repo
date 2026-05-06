import { AIMessage } from '@langchain/core/messages';
import { RunnableLambda } from '@langchain/core/runnables';
import { ConversationService } from '../src/conversation/conversation.service';

jest.mock('../src/llm/model.factory', () => {
  const model = RunnableLambda.from(async (promptValue: any) => {
    const messages = promptValue?.toChatMessages?.() ?? [];
    const latestHumanMessage = messages[messages.length - 1]?.text ?? '';
    const historyContext = messages
      .slice(0, -1)
      .map((message: { text?: string }) => message.text ?? '')
      .filter(Boolean)
      .join(' | ');

    return new AIMessage(`回复:${latestHumanMessage};历史:${historyContext}`);
  });

  return {
    createChatModel: () => model,
  };
});

describe('ConversationService', () => {
  it('should chat through RunnableWithMessageHistory and persist both sides', async () => {
    const storedMessages: Array<{
      role: string;
      content: string;
      metadata?: Record<string, unknown> | null;
    }> = [
      { role: 'human', content: '我买的蓝牙耳机降噪效果不好' },
      { role: 'ai', content: '请提供订单号' },
    ];

    const prisma = {
      conversation: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({
          id: 'conv-1',
          userId: 'user-1',
          title: '新会话',
        }),
        delete: jest.fn(),
      },
    };

    const messageService = {
      addMessage: jest.fn().mockImplementation(
        async (
          _conversationId: string,
          role: string,
          content: string,
          metadata?: Record<string, unknown> | null,
        ) => {
          storedMessages.push({ role, content, metadata: metadata ?? null });
        },
      ),
      getHistoryAsLangChainMessages: jest.fn(async () =>
        storedMessages.map((message) => {
          if (message.role === 'ai') {
            return new AIMessage(message.content);
          }

          const { HumanMessage } = require('@langchain/core/messages');
          return new HumanMessage(message.content);
        }),
      ),
    };

    const service = new ConversationService(prisma as any, messageService as any);
    const reply = await service.chat('conv-1', 'user-1', '订单号是 EC20240315001');

    expect(prisma.conversation.findUnique).toHaveBeenCalledWith({
      where: { id: 'conv-1' },
    });
    expect(messageService.getHistoryAsLangChainMessages).toHaveBeenCalledWith(
      'conv-1',
    );
    expect(reply).toContain('订单号是 EC20240315001');
    expect(reply).toContain('我买的蓝牙耳机降噪效果不好');
    expect(messageService.addMessage).toHaveBeenNthCalledWith(
      1,
      'conv-1',
      'human',
      '订单号是 EC20240315001',
      undefined,
    );
    expect(messageService.addMessage).toHaveBeenNthCalledWith(
      2,
      'conv-1',
      'ai',
      expect.stringContaining('回复:订单号是 EC20240315001'),
      undefined,
    );
  });
});
