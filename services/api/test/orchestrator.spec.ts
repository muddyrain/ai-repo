import { OrchestratorService } from '../src/llm/agents/orchestrator.service';
import {
  extractAgent,
  policyCheckAgent,
  qaAgent,
  riskReviewAgent,
  summaryAgent,
} from '../src/llm/agents/sub-agents';

jest.mock('../src/llm/agents/sub-agents', () => ({
  extractAgent: { invoke: jest.fn() },
  policyCheckAgent: { invoke: jest.fn() },
  riskReviewAgent: { invoke: jest.fn() },
  qaAgent: { invoke: jest.fn() },
  summaryAgent: { invoke: jest.fn() },
}));

const mockedExtractAgent = extractAgent as jest.Mocked<typeof extractAgent>;
const mockedPolicyCheckAgent = policyCheckAgent as jest.Mocked<
  typeof policyCheckAgent
>;
const mockedRiskReviewAgent = riskReviewAgent as jest.Mocked<
  typeof riskReviewAgent
>;
const mockedQaAgent = qaAgent as jest.Mocked<typeof qaAgent>;
const mockedSummaryAgent = summaryAgent as jest.Mocked<typeof summaryAgent>;

describe('OrchestratorService', () => {
  let service: OrchestratorService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OrchestratorService();
  });

  it('should execute the fixed multi-agent workflow', async () => {
    mockedExtractAgent.invoke.mockResolvedValue(
      JSON.stringify({
        orderId: 'EC20240315001',
        productId: null,
        requestType: 'return',
        receivedDate: '昨天',
        isUnopened: true,
      }),
    );
    mockedPolicyCheckAgent.invoke.mockResolvedValue('符合 7 天退货条件');
    mockedRiskReviewAgent.invoke.mockResolvedValue('未发现高风险点');
    mockedQaAgent.invoke.mockResolvedValue(
      'Given 订单已收货 When 用户申请退货 Then 进入退货审核',
    );
    mockedSummaryAgent.invoke.mockResolvedValue('最终退货判断报告');

    const result = await service.orchestrate(
      '我买的蓝牙耳机降噪效果不好，订单号 EC20240315001，昨天收到还没拆封，想退货',
    );

    expect(result).toMatchObject({
      mode: 'fixed_workflow',
      clarificationQuestions: [],
      fallback: null,
      report: '最终退货判断报告',
    });
    expect(result.usedAgents).toEqual([
      'extractAgent',
      'policyCheckAgent',
      'riskReviewAgent',
      'qaAgent',
      'summaryAgent',
    ]);
  });

  it('should stop for clarification when required fields are missing', async () => {
    mockedExtractAgent.invoke.mockResolvedValue(
      JSON.stringify({
        orderId: null,
        productId: null,
        requestType: 'return',
        receivedDate: null,
        isUnopened: null,
      }),
    );

    const result = await service.orchestrate('我想退货');

    expect(result.mode).toBe('clarification');
    expect(result.usedAgents).toEqual(['extractAgent']);
    expect(result.report).toBeNull();
    expect(result.clarificationQuestions).toEqual([
      '请提供订单号。',
      '请提供签收日期或收货时间。',
      '请确认商品是否未拆封且不影响二次销售。',
    ]);
    expect(mockedPolicyCheckAgent.invoke).not.toHaveBeenCalled();
    expect(mockedRiskReviewAgent.invoke).not.toHaveBeenCalled();
    expect(mockedQaAgent.invoke).not.toHaveBeenCalled();
    expect(mockedSummaryAgent.invoke).not.toHaveBeenCalled();
  });

  it('should fallback to manual review on agent failure', async () => {
    mockedExtractAgent.invoke.mockRejectedValue(new Error('model failed'));

    const result = await service.orchestrate('任意输入');

    expect(result).toMatchObject({
      mode: 'fallback',
      fallback: 'manual_review',
      report: null,
    });
  });
});
