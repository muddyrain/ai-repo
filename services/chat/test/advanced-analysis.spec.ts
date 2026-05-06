import { AdvancedAnalysisService } from '../src/llm/advanced-analysis.service';
import { writeFileTool } from '../src/llm/tools/business.tools';

jest.mock('../src/llm/tools/business.tools', () => ({
  writeFileTool: {
    invoke: jest.fn(),
  },
}));

const mockedWriteFileTool = writeFileTool as jest.Mocked<typeof writeFileTool>;

describe('AdvancedAnalysisService', () => {
  const memoryService = {
    getHistory: jest.fn(),
    appendMessage: jest.fn(),
  };
  const orchestratorService = {
    orchestrate: jest.fn(),
  };

  let service: AdvancedAnalysisService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdvancedAnalysisService(
      memoryService as any,
      orchestratorService as any,
    );
  });

  it('should analyze with history, write ticket, and append final report', async () => {
    memoryService.getHistory.mockResolvedValue([
      {
        role: 'human',
        content: '我买的蓝牙耳机降噪效果不好，想退货',
      },
      {
        role: 'ai',
        content: '请提供订单号。',
      },
      {
        role: 'human',
        content: '订单号是 EC20240315001',
      },
      {
        role: 'ai',
        content: '已记录订单号。',
      },
      {
        role: 'human',
        content: '昨天收到，还没拆封',
      },
      {
        role: 'ai',
        content: '已记录签收和包装状态。',
      },
    ]);
    orchestratorService.orchestrate.mockResolvedValue({
      mode: 'fixed_workflow',
      clarificationQuestions: [],
      usedAgents: ['RequirementExtractAgent', 'SummaryAgent'],
      fallback: null,
      steps: {
        extract: '{"orderId":"EC20240315001"}',
      },
      report: '订单 EC20240315001 可以进入退货审核，下一步请提交退货申请。',
    });
    mockedWriteFileTool.invoke.mockResolvedValue({
      path: 'tickets/EC20240315001-advanced-analysis.md',
      written: true,
    } as any);

    const result = await service.analyze(
      's1',
      '帮我判断一下能不能退，如果可以请告诉我下一步操作',
    );

    expect(orchestratorService.orchestrate).toHaveBeenCalledWith(
      expect.stringContaining('历史对话：'),
    );
    expect(orchestratorService.orchestrate).toHaveBeenCalledWith(
      expect.stringContaining('订单号是 EC20240315001'),
    );
    expect(mockedWriteFileTool.invoke).toHaveBeenCalledWith({
      path: 'tickets/EC20240315001-advanced-analysis.md',
      content: '订单 EC20240315001 可以进入退货审核，下一步请提交退货申请。',
    });
    expect(memoryService.appendMessage).toHaveBeenCalledWith(
      's1',
      '帮我判断一下能不能退，如果可以请告诉我下一步操作',
      '订单 EC20240315001 可以进入退货审核，下一步请提交退货申请。',
    );
    expect(result.ticket?.path).toBe(
      'tickets/EC20240315001-advanced-analysis.md',
    );
  });

  it('should not write ticket when clarification is required', async () => {
    memoryService.getHistory.mockResolvedValue([]);
    orchestratorService.orchestrate.mockResolvedValue({
      mode: 'fixed_workflow',
      clarificationQuestions: ['请提供订单号'],
      usedAgents: ['RequirementExtractAgent'],
      fallback: 'ask_user',
      report: null,
    });

    const result = await service.analyze('s1', '我想退货');

    expect(mockedWriteFileTool.invoke).not.toHaveBeenCalled();
    expect(memoryService.appendMessage).toHaveBeenCalledWith(
      's1',
      '我想退货',
      '需要补充信息：请提供订单号',
    );
    expect(result.ticket).toBeUndefined();
  });
});
