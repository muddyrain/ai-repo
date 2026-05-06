import { Injectable, ForbiddenException } from '@nestjs/common';
import { BaseMessage } from '@langchain/core/messages';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { RunnableWithMessageHistory } from '@langchain/core/runnables';
import { PrismaService } from '../prisma/prisma.service';
import { createChatModel } from '../llm/model.factory';
import { DatabaseChatMessageHistory } from './db-chat-history';
import { MessageService } from './message.service';

type ConversationChatInput = {
  input: string;
  history?: BaseMessage[];
};

@Injectable()
export class ConversationService {
  private readonly model = createChatModel();
  private readonly prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      [
        '你是电商客服系统中的退换货助手。',
        '你需要结合当前会话历史理解用户诉求、订单号、商品问题和售后意图。',
        '回答要简洁、可执行；信息不足时说明还需要哪些信息。',
      ].join(''),
    ],
    new MessagesPlaceholder('history'),
    ['human', '{input}'],
  ]);
  private readonly chain = this.prompt.pipe(this.model);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageService: MessageService,
  ) {}

  async create(userId: string, title?: string) {
    return this.prisma.conversation.create({
      data: { userId, title: title?.trim() || '新会话' },
    });
  }

  async findByUser(userId: string) {
    return this.prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { messages: true } } },
    });
  }

  async findById(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation || conversation.userId !== userId) {
      throw new ForbiddenException('无权访问该会话');
    }
    return conversation;
  }

  async delete(conversationId: string, userId: string) {
    await this.findById(conversationId, userId); // 权限校验
    return this.prisma.conversation.delete({
      where: { id: conversationId },
    });
  }

  async chat(conversationId: string, userId: string, input: string) {
    await this.findById(conversationId, userId);

    const chainWithHistory = new RunnableWithMessageHistory<
      ConversationChatInput,
      BaseMessage
    >({
      runnable: this.chain,
      getMessageHistory: (sessionId: string) =>
        new DatabaseChatMessageHistory(this.messageService, sessionId),
      inputMessagesKey: 'input',
      historyMessagesKey: 'history',
    });

    const response = await chainWithHistory.invoke(
      { input },
      { configurable: { sessionId: conversationId } },
    );

    return typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content);
  }
}
