import { Injectable } from '@nestjs/common';
import { RunnableMemoryService } from './memory/runnable-memory.service';
import { OrchestratorService } from './agents/orchestrator.service';
import { FilesystemService } from './filesystem/filesystem.service';

@Injectable()
export class AdvancedAnalysisService {
  constructor(
    private memory: RunnableMemoryService,
    private orchestrator: OrchestratorService,
    private files: FilesystemService,
  ) {}

  async analyze(sessionId: string, input: string) {
    const history = await this.memory.getHistory(sessionId);
    const enrichedInput = [
      history.length ? `历史上下文：${JSON.stringify(history)}` : '',
      `当前输入：${input}`,
    ].filter(Boolean).join('\n\n');

    const result = await this.orchestrator.orchestrate(enrichedInput);
    if (!result.clarificationQuestions?.length) {
      await this.files.writeFile(
        `tickets/EC20240315001-analysis.md`,
        result.report,
      );
    }

    // 用 appendMessage 写回结论，不重新调用模型
    await this.memory.appendMessage(sessionId, input, result.report ?? '分析完成');
    return result;
  }
}
