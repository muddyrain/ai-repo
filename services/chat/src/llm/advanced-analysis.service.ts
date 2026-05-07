import { Injectable } from '@nestjs/common';
import { BaseMessage } from '@langchain/core/messages';
import { DatabaseChatMessageHistory } from '../conversation/db-chat-history';
import { MessageService } from '../conversation/message.service';
import { SearchService } from '../embedding/search.service';
import { loadLangChainConfig } from '../config/load-langchain-config';
import { OrchestratorService } from './agents/orchestrator.service';

@Injectable()
export class AdvancedAnalysisService {
  private readonly retrievalTopK = loadLangChainConfig().retrieval.topK;

  constructor(
    private readonly messageService: MessageService,
    private readonly searchService: SearchService,
    private readonly orchestratorService: OrchestratorService,
  ) { }

  async analyze(userId: string, conversationId: string, input: string) {
    // 1. 读取会话历史
    const history = new DatabaseChatMessageHistory(
      this.messageService,
      conversationId,
    );

    const messages = await history.getMessages();

    // 2. 语义检索用户文档
    const retrievedDocs = await this.searchService.similaritySearch(
      input,
      userId,
      this.retrievalTopK,
    );
    // 3. 组装完整上下文
    const contextParts = [
      messages.length
        ? `历史对话：\n${this.formatHistory(messages)}`
        : '',
      retrievedDocs.length
        ? `相关文档：\n${retrievedDocs.map((d) => `[${d.originalName}] ${d.content}`).join('\n---\n')}`
        : '',
      `当前输入：${input}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    // 4. 调用 Multi-Agent 分析
    const result = await this.orchestratorService.orchestrate(contextParts);

    // 5. 写入消息历史
    await history.addMessage(new (await import('@langchain/core/messages')).HumanMessage(input));
    await history.addMessage(
      new (await import('@langchain/core/messages')).AIMessage(
        result.report ?? '分析未完成',
      ),
    );

    // 6. 返回完整结果
    return {
      ...result,
      retrievedDocuments: retrievedDocs.map((d) => ({
        documentName: d.originalName,
        content: d.content.slice(0, 200) + '...',
        score: d.score,
      })),
    };
  }

  private formatHistory(messages: BaseMessage[]) {
    return messages
      .map((message) => {
        const role = message.getType();
        const content =
          typeof message.content === 'string'
            ? message.content
            : JSON.stringify(message.content);

        return `${role}: ${content}`;
      })
      .join('\n');
  }
}
