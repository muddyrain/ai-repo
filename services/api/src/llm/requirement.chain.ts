import { StringOutputParser } from '@langchain/core/output_parsers';
import { requirementPrompt } from './requirement.prompt-builder';
import { createChatModel } from './model.factory';

const model = createChatModel();
const parser = new StringOutputParser();

export const requirementChain = requirementPrompt
  .pipe(model)
  .pipe(parser);
