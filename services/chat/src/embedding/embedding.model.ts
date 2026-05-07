import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/huggingface_transformers';

const MODEL_NAME = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';

let sharedEmbeddings: HuggingFaceTransformersEmbeddings | null = null;

export function getDocumentEmbeddings() {
  if (!sharedEmbeddings) {
    sharedEmbeddings = new HuggingFaceTransformersEmbeddings({
      model: MODEL_NAME,
    });
  }

  return sharedEmbeddings;
}