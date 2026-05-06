import { RequirementService } from '../src/llm/requirement.service';

// Mock createChatModel，避免测试时发起真实 LLM 网络请求
const mockInvoke = jest.fn();
jest.mock('../src/llm/model.factory', () => ({
  createChatModel: () => ({
    withStructuredOutput: () => ({ invoke: mockInvoke }),
  }),
}));

describe('Requirement Extract', () => {
  const service = new RequirementService();

  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it('should extract correctly', async () => {
    mockInvoke.mockResolvedValueOnce({
      action: '用户注册',
      constraints: ['必须绑定手机号', '密码至少8位'],
      entities: ['手机号', '密码'],
    });

    const result = await service.extract(
      '用户注册时必须绑定手机号，密码至少8位'
    );

    expect(result.action).toBe('用户注册');
    expect(result.constraints).toContain('必须绑定手机号');
    expect(result.entities).toContain('手机号');
  });
});
