import {
  BaseChatMessageHistory,
} from '@langchain/core/chat_history';
import {
  BaseMessage,
  HumanMessage,
  AIMessage,
  SystemMessage,
  ToolMessage,
} from '@langchain/core/messages';
import { MessageService } from './message.service';

export class DatabaseChatMessageHistory extends BaseChatMessageHistory {
  lc_namespace = ['custom', 'chat_history'];

  constructor(
    private readonly messageService: MessageService,
    private readonly conversationId: string,
  ) {
    super();
  }

  async getMessages(): Promise<BaseMessage[]> {
    return this.messageService.getHistoryAsLangChainMessages(this.conversationId);
  }


  async addMessage(message: BaseMessage): Promise<void> {
    let role: 'system' | 'human' | 'ai' | 'tool' = 'human';
    if (message instanceof SystemMessage) role = 'system';
    else if (message instanceof AIMessage) role = 'ai';
    else if (message instanceof ToolMessage) role = 'tool';

    await this.messageService.addMessage(
      this.conversationId,
      role,
      this.serializeContent(message.content),
      this.extractMetadata(message),
    );
  }

  async addUserMessage(content: string): Promise<void> {
    await this.addMessage(new HumanMessage(content));
  }

  async addAIMessage(content: string): Promise<void> {
    await this.addMessage(new AIMessage(content));
  }

  async clear(): Promise<void> {
    await this.messageService.clearHistory(this.conversationId);
  }

  private serializeContent(content: BaseMessage['content']) {
    return typeof content === 'string' ? content : JSON.stringify(content);
  }

  private extractMetadata(message: BaseMessage) {
    if (message instanceof ToolMessage) {
      const toolCallId =
        (message as ToolMessage & { tool_call_id?: string }).tool_call_id ??
        (message.lc_kwargs as { tool_call_id?: string } | undefined)
          ?.tool_call_id;

      if (toolCallId) {
        return { tool_call_id: toolCallId };
      }
    }

    return undefined;
  }
}
