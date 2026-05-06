import { VectorStoreService } from '../src/llm/embedding/vector-store.service';

const dimensions = ['退货', '退款', '蓝牙', '耳机', '售后', '订单'];

function embed(text: string) {
  return dimensions.map((keyword) => {
    const matches = text.match(new RegExp(keyword, 'g'));
    return matches?.length ?? 0;
  });
}

describe('VectorStoreService', () => {
  const embeddingService = {
    getEmbeddings: () => ({
      embedDocuments: async (documents: string[]) => documents.map(embed),
      embedQuery: async (text: string) => embed(text),
    }),
  };

  it('should seed initial workspace documents and search similar content', async () => {
    const service = new VectorStoreService(embeddingService as any);

    const refundResults = await service.similaritySearch('退款多久到账', 1);

    expect(refundResults).toHaveLength(1);
    expect(refundResults[0].metadata).toMatchObject({
      source: 'policies/refund-policy.md',
    });
    expect(refundResults[0].pageContent).toContain('原支付渠道');
  });

  it('should add custom documents to MemoryVectorStore', async () => {
    const service = new VectorStoreService(embeddingService as any);

    await service.addDocuments([
      {
        content: '订单 EC20240315001 的蓝牙耳机可进入退货审核。',
        metadata: {
          source: 'tickets/EC20240315001-analysis.md',
        },
      },
    ]);

    const results = await service.similaritySearch('蓝牙耳机退货审核', 1);

    expect(results[0].metadata).toMatchObject({
      source: 'tickets/EC20240315001-analysis.md',
    });
    expect(results[0].pageContent).toContain('EC20240315001');
  });
});
