import { Injectable } from '@nestjs/common';
import {
  extractAgent,
  policyCheckAgent,
  qaAgent,
  riskReviewAgent,
  summaryAgent,
} from './sub-agents';

@Injectable()
export class OrchestratorService {
  async orchestrate(input: string) {
    try {
      const extractResult = await extractAgent.invoke({ input });
      const parsed = JSON.parse(extractResult);
      const clarificationQuestions: string[] = [];
      if (!parsed.orderId) clarificationQuestions.push('请提供订单号');
      if (!parsed.requestType) clarificationQuestions.push('请说明是退货、换货还是退款');

      if (clarificationQuestions.length > 0) {
        return {
          mode: 'fixed_workflow',
          status: 'need_clarification',
          clarificationQuestions,
          usedAgents: ['RequirementExtractAgent'],
          fallback: 'ask_user',
        };
      }

      const [policyResult, riskResult] = await Promise.all([
        policyCheckAgent.invoke({ extractResult }),
        riskReviewAgent.invoke({ extractResult }),
      ]);

      const qaResult = await qaAgent.invoke({ input, extractResult });
      const report = await summaryAgent.invoke({
        extractResult,
        policyResult,
        riskResult,
        qaResult,
      });
      return {
        mode: 'fixed_workflow',
        clarificationQuestions: [],
        usedAgents: [
          'RequirementExtractAgent',
          'PolicyCheckAgent',
          'RiskReviewAgent',
          'QAAgent',
          'SummaryAgent',
        ],
        fallback: null,
        steps: { extract: extractResult, policyCheck: policyResult, riskReview: riskResult, qa: qaResult },
        report,
      };
    } catch (error) {
      console.log(error);
      return {
        mode: 'fixed_workflow',
        clarificationQuestions: [],
        usedAgents: ['RequirementExtractAgent'],
        fallback: 'manual_review',
        report: '分析流程失败，请转人工复核。',
        error: String(error),
      };
    }
  }
}
