/**
 * Utility to calculate estimated cost based on token usage.
 * Pricing is based on OpenAI GPT-4o-mini via OpenRouter.
 * 
 * Prompt Tokens: $0.150 per 1M tokens -> $0.00000015 per token
 * Completion Tokens: $0.600 per 1M tokens -> $0.00000060 per token
 */

const PROMPT_COST_PER_TOKEN = 0.150 / 1000000;
const COMPLETION_COST_PER_TOKEN = 0.600 / 1000000;

function calculateCost(promptTokens, completionTokens) {
  const promptCost = promptTokens * PROMPT_COST_PER_TOKEN;
  const completionCost = completionTokens * COMPLETION_COST_PER_TOKEN;
  const totalCost = promptCost + completionCost;

  // Return formatted to 6 decimal places to avoid scientific notation
  return totalCost.toFixed(6);
}

module.exports = {
  calculateCost
};
