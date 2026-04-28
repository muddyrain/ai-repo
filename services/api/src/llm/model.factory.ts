import { ChatOpenAI } from '@langchain/openai';
import { getApiKeys, loadLangChainConfig } from '../config/load-langchain-config';

export function createChatModel() {
  const config = loadLangChainConfig();
  const keys = getApiKeys();

  return new ChatOpenAI({
    model: config.llm.model,
    temperature: config.llm.temperature,
    maxTokens: config.llm.maxTokens,
    useResponsesApi: true,
    openAIApiKey: keys.openaiApiKey,
    configuration: keys.openaiBaseUrl
      ? { baseURL: keys.openaiBaseUrl }
      : undefined,
  });
}
