import {
  BaseMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from '@langchain/core/messages';
import { Injectable } from '@nestjs/common';
import { createChatModel } from '../model.factory';
import { businessTools } from '../tools/business.tools';

@Injectable()
export class FilesystemService {
  private readonly model = createChatModel();
  private readonly tools = businessTools;
  private readonly toolMap = new Map<string, any>(
    this.tools.map((toolItem) => [toolItem.name, toolItem]),
  );
  private readonly maxToolIterations = 6;

  async fileChat(input: string) {
    const modelWithTools = this.model.bindTools(this.tools);
    const messages: BaseMessage[] = [
      new SystemMessage(
        [
          '你是电商客服系统中的文件与业务查询助手。',
          '你可以按需查询订单、查询商品、读取政策/FAQ 文件、写入工单或报告。',
          '所有文件路径都必须使用 workspace 内的相对路径，不能带 workspace/ 前缀。',
          '完成工具调用后，用简洁中文总结结果。',
        ].join(''),
      ),
      new HumanMessage(input),
    ];

    for (let i = 0; i < this.maxToolIterations; i += 1) {
      const response = await modelWithTools.invoke(messages);
      messages.push(response);

      const toolCalls = response.tool_calls ?? [];
      if (toolCalls.length === 0) {
        return { result: response.content.toString() };
      }

      for (const toolCall of toolCalls) {
        const targetTool = this.toolMap.get(toolCall.name);
        if (!targetTool || !toolCall.id) {
          continue;
        }

        const toolResult = await targetTool.invoke(toolCall.args);
        messages.push(
          new ToolMessage({
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          }),
        );
      }
    }

    const finalResponse = await modelWithTools.invoke(messages);
    return { result: finalResponse.content.toString() };
  }
}
