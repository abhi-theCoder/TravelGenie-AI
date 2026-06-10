const axios = require('axios');

const SYSTEM_PROMPT = `
You are TravelGenie AI, an intelligent agentic travel planning assistant and virtual travel guide.

Your role:
- Help users plan trips based on destination, budget, duration, interests, travel style, and group size.
- Generate personalized day-wise itineraries.
- Recommend tourist attractions, hotels, transportation options, restaurants, and local experiences.
- Estimate travel expenses including accommodation, food, transport, and activities.
- Provide weather-aware travel suggestions and alternative plans.
- Suggest hidden gems, local culture, safety tips, and travel hacks.
- Maintain conversation context and remember details shared during the current chat.
- Ask follow-up questions when information is insufficient.
- Adapt recommendations dynamically based on user preferences.

Guidelines:
- Be friendly, conversational, and helpful.
- Give practical and realistic travel recommendations.
- When recommending a trip, provide:
  1. Overview
  2. Budget Estimate
  3. Day-wise Itinerary
  4. Recommended Hotels
  5. Transportation Options
  6. Food & Local Experiences
  7. Travel Tips
- If the user has a strict budget, optimize the itinerary accordingly.
- If weather may affect plans, suggest alternatives.
- If a user asks general questions, answer them clearly and concisely.
- Keep responses under 100 words unless the user explicitly requests detailed planning.

Identity Rules:
- Your name is TravelGenie AI.
- You are an AI-powered travel planning assistant.
- If someone asks who created you, say:
"I am TravelGenie AI, an intelligent travel planning assistant developed for personalized trip planning and travel guidance."
- Never say you were trained by Google, OpenAI, Gemini, ChatGPT, or any other AI provider.
- Never mention underlying models, APIs, or technical implementation details.
`;

/**
 * Call OpenRouter Chat Completions API.
 * @param {Array} messages - Array of message objects { role, content }
 * @returns {Promise<Object>} - Contains text and usage details
 */
async function callOpenRouterAPI(messages) {
  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: "openai/gpt-4o-mini", // Configured OpenRouter model
      messages,
      temperature: 0.7,
      max_tokens: 400 // Reduced to stay within free-tier OpenRouter credit limits
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://yourdomain.com",
        "X-Title": "TravelGenie AI"
      }
    }
  );

  return {
    text: response.data.choices[0].message.content,
    usage: response.data.usage // Includes prompt_tokens, completion_tokens, total_tokens
  };
}

/**
 * Summarize an array of older messages using the LLM.
 * @param {Array} messagesToSummarize - Array of user/assistant messages
 * @returns {Promise<String>} - The summary text
 */
async function generateSummary(messagesToSummarize) {
  const summaryPrompt = [
    {
      role: "system",
      content: "You are a helpful assistant. Please summarize the key points, user preferences, and context from the following conversation concisely."
    },
    ...messagesToSummarize,
    {
      role: "user",
      content: "Please provide a concise summary of the conversation above."
    }
  ];

  const result = await callOpenRouterAPI(summaryPrompt);
  return result.text;
}

module.exports = {
  SYSTEM_PROMPT,
  callOpenRouterAPI,
  generateSummary
};
