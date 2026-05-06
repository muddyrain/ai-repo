import { Injectable } from '@nestjs/common';
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from '@langchain/core/messages';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type ConversationMessageRole = 'system' | 'human' | 'ai' | 'tool';

type MessageInputMetadata =
  | Prisma.InputJsonValue
  | undefined;
type MessageMetadata = Prisma.JsonValue | null | undefined;

@Injectable()
export class MessageService {
  constructor(private readonly prisma: PrismaService) {}

  async addMessage(
    conversationId: string,
    role: ConversationMessageRole,
    content: string,
    metadata?: MessageInputMetadata,
  ) {
    await this.prisma.message.create({
      data: {
        conversationId,
        role,
        content,
        metadata: metadata ?? undefined,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
  }

  async getHistory(conversationId: string, limit?: number) {
    if (typeof limit === 'number' && limit > 0) {
      const messages = await this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return messages.reverse();
    }

    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getHistoryAsLangChainMessages(
    conversationId: string,
  ): Promise<BaseMessage[]> {
    const messages = await this.getHistory(conversationId);

    return messages.map((message) => this.toLangChainMessage(message));
  }

  async clearHistory(conversationId: string) {
    await this.prisma.message.deleteMany({
      where: { conversationId },
    });
  }

  private toLangChainMessage(message: {
    role: string;
    content: string;
    metadata: MessageMetadata;
  }): BaseMessage {
    switch (message.role) {
      case 'system':
        return new SystemMessage(message.content);
      case 'ai':
        return new AIMessage(message.content);
      case 'tool':
        return new ToolMessage({
          content: message.content,
          tool_call_id: this.getToolCallId(message.metadata),
        });
      case 'human':
      default:
        return new HumanMessage(message.content);
    }
  }

  private getToolCallId(metadata: MessageMetadata) {
    if (!metadata || typeof metadata !== 'object') {
      return '';
    }

    const toolCallId = (metadata as Record<string, unknown>).tool_call_id;
    return typeof toolCallId === 'string' ? toolCallId : '';
  }
}
