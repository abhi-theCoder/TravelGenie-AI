/**
 * In-memory storage for chat sessions.
 * Note: In a real production app, this should be replaced by Redis or a database.
 * 
 * Structure:
 * sessionMap = Map {
 *   sessionId: {
 *     sessionId: String,
 *     messages: Array
 *   }
 * }
 */

const sessionMap = new Map();

function getSession(sessionId) {
  return sessionMap.get(sessionId);
}

function createSession(sessionId) {
  const session = {
    sessionId,
    messages: []
  };
  sessionMap.set(sessionId, session);
  return session;
}

function updateSessionMessages(sessionId, messages) {
  const session = sessionMap.get(sessionId);
  if (session) {
    session.messages = messages;
    sessionMap.set(sessionId, session);
  }
}

module.exports = {
  getSession,
  createSession,
  updateSessionMessages
};
