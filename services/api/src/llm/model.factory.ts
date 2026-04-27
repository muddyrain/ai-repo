import { ChatOpenAI } from '@langchain/openai';
import { getApiKeys, loadLangChainConfig } from '../config/load-langchain-config';

export function createChatModel() {
  const config = loadLangChainConfig();
  const apiKeys = getApiKeys();

  return new ChatOpenAI({
    model: config.llm.model,
    temperature: config.llm.temperature,
    maxTokens: config.llm.maxTokens,
    apiKey: apiKeys.openaiApiKey,
    configuration: apiKeys.openaiBaseUrl
      ? {
          baseURL: apiKeys.openaiBaseUrl,
        }
      : undefined,
  });
}
