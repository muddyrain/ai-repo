import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Injectable } from '@nestjs/common';
import { createChatModel } from './model.factory';

const SYSTEM_ROLE = '需求结构化抽取助手';
const USER_INPUT = '用户注册时必须绑定手机号，密码至少8位';

@Injectable()
export class LlmService {
  private model = createChatModel();
  async invoke() {
    try {
      const result = await this.model.invoke(this.buildMessages());
      return {
        input: USER_INPUT,
        message: this.readContent(result.content),
      };
    } catch (err) {
      console.error('LLM invoke error:', err);
      throw err;
    }
  }

  async *stream(): AsyncGenerator<string> {
    const stream = await this.model.stream(this.buildMessages());

    for await (const chunk of stream) {
      const text = this.readContent(chunk.content);
      if (text) {
        yield text;
      }
    }
  }

  async batch() {
    const requests = [this.buildMessages(), this.buildMessages()];
    const results = await this.model.batch(requests);

    return {
      input: USER_INPUT,
      messages: results.map((item) => this.readContent(item.content)),
    };
  }

  private buildMessages() {
    return [new SystemMessage(SYSTEM_ROLE), new HumanMessage(USER_INPUT)];
  }

  private readContent(content: unknown): string {
    if (typeof content === 'string') {
      return content;
    }

    if (!Array.isArray(content)) {
      return '';
    }

    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part;
        }

        if (part && typeof part === 'object' && 'text' in part) {
          const text = (part as { text?: unknown }).text;
          return typeof text === 'string' ? text : '';
        }

        return '';
      })
      .join('');
  }
}
