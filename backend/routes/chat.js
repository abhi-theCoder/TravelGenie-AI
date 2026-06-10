const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const chatMemory = require('../services/chatMemory');
const openrouter = require('../services/openrouter');
const { calculateCost } = require('../utils/costCalculator');

// Fallback values if not set in .env
const MAX_CONTEXT_MESSAGES = parseInt(process.env.MAX_CONTEXT_MESSAGES) || 20;
const SUMMARY_TRIGGER = parseInt(process.env.SUMMARY_TRIGGER) || 20;

router.post("/", async (req, res) => {
  try {
    let { sessionId, message } = req.body;

    // 1. Request Validation
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: "A valid 'message' string is required." });
    }

    // 2. Session Handling
    // Automatically create a new session if one is not provided
    if (!sessionId) {
      sessionId = uuidv4();
      chatMemory.createSession(sessionId);
    }

    // Retrieve existing session or create if it doesn't exist (e.g. server restart)
    let session = chatMemory.getSession(sessionId);
    if (!session) {
      session = chatMemory.createSession(sessionId);
    }

    let messages = session.messages;

    // 3. Add the new user message to session memory
    messages.push({ role: "user", content: message });

    // 4. Automatic Conversation Summarization
    // If the conversation history (excluding system prompt) exceeds the summary trigger limit
    if (messages.length > SUMMARY_TRIGGER) {
      // Keep the most recent 6 messages to preserve immediate context (3 pairs)
      const recentMessagesCount = 6;
      const messagesToSummarize = messages.slice(0, messages.length - recentMessagesCount);
      const recentMessages = messages.slice(messages.length - recentMessagesCount);

      // Generate a summary of older messages
      const summaryText = await openrouter.generateSummary(messagesToSummarize);

      // Replace older messages with a single system summary message
      messages = [
        { role: "system", content: `Conversation Summary: ${summaryText}` },
        ...recentMessages
      ];
    }

    // 5. Limit Context for the API call
    // Ensure we don't send more than MAX_CONTEXT_MESSAGES (plus system prompt)
    let contextMessages = messages;
    if (contextMessages.length > MAX_CONTEXT_MESSAGES) {
      contextMessages = contextMessages.slice(contextMessages.length - MAX_CONTEXT_MESSAGES);
    }

    // 6. Prepend the main TravelGenie System Prompt
    const apiPayload = [
      { role: "system", content: openrouter.SYSTEM_PROMPT },
      ...contextMessages
    ];

    // 7. Call OpenRouter API
    const result = await openrouter.callOpenRouterAPI(apiPayload);

    // 8. Add assistant response to session memory
    messages.push({ role: "assistant", content: result.text });
    
    // Update the memory map with modified/appended messages
    chatMemory.updateSessionMessages(sessionId, messages);

    // 9. Cost Estimation
    const estimatedCost = calculateCost(
      result.usage?.prompt_tokens || 0,
      result.usage?.completion_tokens || 0
    );

    // 10. Return Response
    // Log token usage on the server console for monitoring
    console.log(`Token Usage [Session: ${sessionId}]:`, result.usage, `| Estimated Cost: $${estimatedCost}`);

    res.json({
      sessionId,
      text: result.text,
      usage: result.usage,
      estimatedCost
    });

  } catch (error) {
    console.error("Chat Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to process chat response." });
  }
});

module.exports = router;
