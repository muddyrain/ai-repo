import { RunnableMemoryService } from '../src/llm/memory/runnable-memory.service';

jest.mock('../src/llm/model.factory', () => {
  const { AIMessage } = require('@langchain/core/messages');
  const { RunnableLambda } = require('@langchain/core/runnables');

  const model = RunnableLambda.from(async (promptValue: any) => {
    const messages = promptValue?.toChatMessages?.() ?? [];
    const latestHumanMessage = messages[messages.length - 1]?.text ?? '';
    const context = messages.map((message) => message.text).join(' | ');

    return new AIMessage(`客服回复：${latestHumanMessage}；上下文：${context}`);
  });

  model.getNumTokens = async (text: string) => text.length;

  return {
    createChatModel: () => model,
  };
});

describe('RunnableMemoryService', () => {
  let service: RunnableMemoryService;

  beforeEach(() => {
    service = new RunnableMemoryService();
  });

  it('should keep ecommerce support context by session id', async () => {
    await service.chat('s1', '我买的蓝牙耳机降噪效果不好，想退货');
    await service.chat('s1', '订单号是 EC20240315001');
    const result = await service.chat('s1', '帮我判断一下这个订单能不能退');

    expect(result).toContain('蓝牙耳机降噪效果不好');
    expect(result).toContain('EC20240315001');
    expect(result).toContain('帮我判断一下这个订单能不能退');

    const history = await service.getHistory('s1');
    expect(history).toHaveLength(6);
    expect(history.map((message) => message.role)).toEqual([
      'human',
      'ai',
      'human',
      'ai',
      'human',
      'ai',
    ]);
  });

  it('should isolate and clear sessions', async () => {
    await service.appendMessage('s1', 'human s1', 'ai s1');
    await service.appendMessage('s2', 'human s2', 'ai s2');

    await service.clearSession('s1');

    expect(await service.getHistory('s1')).toEqual([]);
    expect(await service.getHistory('s2')).toHaveLength(2);
  });
});
