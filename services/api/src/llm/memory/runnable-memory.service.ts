import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  trimMessages,
} from '@langchain/core/messages';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import {
  RunnableLambda,
  RunnableWithMessageHistory,
} from '@langchain/core/runnables';
import { InMemoryChatMessageHistory } from '@langchain/core/chat_history';
import { Injectable } from '@nestjs/common';
import { createChatModel } from '../model.factory';

type MemoryChatInput = {
  input: string;
  history?: BaseMessage[];
};

export type SerializedMemoryMessage = {
  role: string;
  content: string;
};

@Injectable()
export class RunnableMemoryService {
  private readonly model = createChatModel();
  private readonly histories = new Map<string, InMemoryChatMessageHistory>();
  private readonly prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      [
        '你是电商客服系统中的退换货助手。',
        '你需要结合历史对话理解用户诉求、订单号、商品问题和售后意图。',
        '回答要简洁、可执行；信息不足时说明还需要哪些信息。',
      ].join(''),
    ],
    new MessagesPlaceholder('history'),
    ['human', '{input}'],
  ]);

  private readonly chain = this.prompt.pipe(this.model);

  private readonly chainWithHistory = new RunnableWithMessageHistory<
    MemoryChatInput,
    BaseMessage
  >({
    runnable: this.chain,
    getMessageHistory: (sessionId: string) => this.getSessionHistory(sessionId),
    inputMessagesKey: 'input',
    historyMessagesKey: 'history',
  });

  private readonly trimmedChain = RunnableLambda.from(
    async ({ input, history = [] }: MemoryChatInput) => {
      const trimmedHistory = await trimMessages(history, {
        maxTokens: 2000,
        strategy: 'last',
        tokenCounter: this.model,
      });

      return this.chain.invoke({ input, history: trimmedHistory });
    },
  );

  private readonly trimmedChainWithHistory = new RunnableWithMessageHistory<
    MemoryChatInput,
    BaseMessage
  >({
    runnable: this.trimmedChain,
    getMessageHistory: (sessionId: string) => this.getSessionHistory(sessionId),
    inputMessagesKey: 'input',
    historyMessagesKey: 'history',
  });

  async chat(sessionId: string, input: string) {
    return this.invokeMemoryChain(sessionId, input, true);
  }

  async getHistory(sessionId: string) {
    const messages = await this.getSessionHistory(sessionId).getMessages();
    return messages.map((message) => this.serializeMessage(message));
  }

  async appendMessage(sessionId: string, human: string, ai: string) {
    await this.getSessionHistory(sessionId).addMessages([
      new HumanMessage(human),
      new AIMessage(ai),
    ]);

    return this.getHistory(sessionId);
  }

  async clearSession(sessionId: string) {
    await this.getSessionHistory(sessionId).clear();
  }

  private async invokeMemoryChain(
    sessionId: string,
    input: string,
    trimHistory: boolean,
  ) {
    const chain = trimHistory
      ? this.trimmedChainWithHistory
      : this.chainWithHistory;
    const response = await chain.invoke(
      { input },
      { configurable: { sessionId } },
    );

    return response.content.toString();
  }

  private getSessionHistory(sessionId: string) {
    if (!this.histories.has(sessionId)) {
      this.histories.set(sessionId, new InMemoryChatMessageHistory());
    }

    return this.histories.get(sessionId)!;
  }

  private serializeMessage(message: BaseMessage): SerializedMemoryMessage {
    return {
      role: message.type,
      content: message.text,
    };
  }
}
