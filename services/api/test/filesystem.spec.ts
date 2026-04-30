import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AIMessage } from '@langchain/core/messages';
import { FilesystemService } from '../src/llm/filesystem/filesystem.service';
import {
  queryOrderTool,
  readFileTool,
  writeFileTool,
} from '../src/llm/tools/business.tools';

const invokeMock = jest.fn();
const ticketPath = resolve(
  process.cwd(),
  'workspace/tickets/EC20240315001-analysis.md',
);
let originalTicketContent = '';

jest.mock('../src/llm/model.factory', () => ({
  createChatModel: () => ({
    bindTools: () => ({
      invoke: invokeMock,
    }),
  }),
}));

beforeAll(async () => {
  originalTicketContent = await readFile(ticketPath, 'utf8');
});

afterEach(async () => {
  await writeFile(ticketPath, originalTicketContent, 'utf8');
});

describe('business tools', () => {
  it('should query order and read policy from workspace', async () => {
    const order = await queryOrderTool.invoke({
      orderId: 'EC20240315001',
    });
    const policy = await readFileTool.invoke({
      path: 'policies/return-policy.md',
    });

    expect(order).toMatchObject({
      orderId: 'EC20240315001',
      productName: '蓝牙降噪耳机',
    });
    expect(policy).toMatchObject({
      path: 'policies/return-policy.md',
    });
    expect(policy.content).toContain('7 天内');
  });

  it('should write files inside workspace and reject escaped paths', async () => {
    const result = await writeFileTool.invoke({
      path: 'tickets/EC20240315001-analysis.md',
      content: '退货判断：可进入人工审核。',
    });

    expect(result).toMatchObject({
      path: 'tickets/EC20240315001-analysis.md',
      written: true,
    });

    await expect(
      readFileTool.invoke({ path: '../package.json' }),
    ).rejects.toThrow('Path escapes workspace sandbox');
  });
});

describe('FilesystemService', () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it('should run a complete tool loop for file chat', async () => {
    invokeMock
      .mockResolvedValueOnce(
        new AIMessage({
          content: '',
          tool_calls: [
            {
              id: 'call_query_order',
              name: 'query_order',
              args: { orderId: 'EC20240315001' },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        new AIMessage({
          content: '',
          tool_calls: [
            {
              id: 'call_read_policy',
              name: 'read_file',
              args: { path: 'policies/return-policy.md' },
            },
            {
              id: 'call_write_ticket',
              name: 'write_file',
              args: {
                path: 'tickets/EC20240315001-analysis.md',
                content: '退货判断：符合 7 天内退货条件，可进入审核。',
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        new AIMessage('已查询订单、读取退货政策，并写入退货判断报告。'),
      );

    const service = new FilesystemService();
    const result = await service.fileChat(
      '把退货判断结论写入 tickets/EC20240315001-analysis.md',
    );

    expect(result).toEqual({
      result: '已查询订单、读取退货政策，并写入退货判断报告。',
    });
    expect(invokeMock).toHaveBeenCalledTimes(3);
  });
});
