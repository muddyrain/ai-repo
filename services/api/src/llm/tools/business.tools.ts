import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, normalize, resolve, sep } from 'node:path';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const WORKSPACE_ROOT = resolve(process.cwd(), 'workspace');

function safePath(relativePath: string) {
  if (relativePath.includes('\0')) {
    throw new Error('Invalid workspace path');
  }

  if (isAbsolute(relativePath)) {
    throw new Error('Only relative workspace paths are allowed');
  }

  const normalizedPath = normalize(relativePath);
  const absolutePath = resolve(WORKSPACE_ROOT, normalizedPath);
  const workspacePrefix = `${WORKSPACE_ROOT}${sep}`;

  if (
    absolutePath !== WORKSPACE_ROOT &&
    !absolutePath.startsWith(workspacePrefix)
  ) {
    throw new Error('Path escapes workspace sandbox');
  }

  return absolutePath;
}

async function readWorkspaceFile(relativePath: string) {
  return readFile(safePath(relativePath), 'utf8');
}

async function writeWorkspaceFile(relativePath: string, content: string) {
  const targetPath = safePath(relativePath);
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, content, 'utf8');

  return {
    path: relativePath,
    bytes: Buffer.byteLength(content, 'utf8'),
    written: true,
  };
}

export const queryOrderTool = tool(
  async ({ orderId }: { orderId: string }) => {
    const content = await readWorkspaceFile(`orders/${orderId}.json`);
    return JSON.parse(content);
  },
  {
    name: 'query_order',
    description: '根据订单号读取 workspace/orders/{orderId}.json 的订单详情',
    schema: z.object({
      orderId: z.string().min(1).describe('订单号，例如 EC20240315001'),
    }),
  },
);

export const queryProductTool = tool(
  async ({ productId }: { productId: string }) => {
    const content = await readWorkspaceFile(`products/${productId}.json`);
    return JSON.parse(content);
  },
  {
    name: 'query_product',
    description: '根据商品 ID 读取 workspace/products/{productId}.json 的商品详情',
    schema: z.object({
      productId: z.string().min(1).describe('商品 ID'),
    }),
  },
);

export const readFileTool = tool(
  async ({ path }: { path: string }) => {
    return {
      path,
      content: await readWorkspaceFile(path),
    };
  },
  {
    name: 'read_file',
    description: '读取 workspace/ 下指定相对路径的文件内容，例如政策、FAQ 等',
    schema: z.object({
      path: z
        .string()
        .min(1)
        .describe('workspace 内的相对路径，不带 workspace/ 前缀'),
    }),
  },
);

export const writeFileTool = tool(
  async ({ path, content }: { path: string; content: string }) => {
    return writeWorkspaceFile(path, content);
  },
  {
    name: 'write_file',
    description: '将内容写入 workspace/ 下指定相对路径，例如工单、报告',
    schema: z.object({
      path: z
        .string()
        .min(1)
        .describe('workspace 内的相对路径，不带 workspace/ 前缀'),
      content: z.string().describe('要写入文件的内容'),
    }),
  },
);

export const businessTools = [
  queryOrderTool,
  queryProductTool,
  readFileTool,
  writeFileTool,
];
