// DOM elements
const chatBox = document.getElementById("chat-box");
const userInputField = document.getElementById("user-input");
const welcomeScreen = document.getElementById("welcome-screen");

// Session management — persist sessionId across page refreshes
let sessionId = localStorage.getItem("travelgenie_session_id") || null;

// Event listener for pressing Enter to send message
userInputField.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

// Helper to prefill suggestion chips
function useSuggestion(promptText) {
  userInputField.value = promptText;
  userInputField.focus();
  sendMessage();
}

// Function to format text (handles simple line breaks and bold tags)
function formatMessage(text) {
  // Replace asterisks with strong tag
  let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Convert newlines to break tags
  return formatted.replace(/\n/g, '<br>');
}

// Helper to append message bubble to UI
function appendMessage(sender, text) {
  // Hide welcome screen if visible
  if (welcomeScreen && welcomeScreen.style.display !== "none") {
    welcomeScreen.style.display = "none";
  }

  const messageElement = document.createElement("div");
  messageElement.classList.add("message", sender);

  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  messageElement.innerHTML = `
    <div class="msg-avatar">${sender === 'user' ? 'U' : 'AI'}</div>
    <div class="msg-content-wrapper">
      <div class="msg-bubble">${formatMessage(text)}</div>
      <span class="msg-time">${timestamp}</span>
    </div>
  `;

  chatBox.appendChild(messageElement);
  scrollToBottom();
}

// Helper to show/remove typing indicator
let typingIndicator = null;
function showTypingIndicator() {
  if (typingIndicator) return;

  typingIndicator = document.createElement("div");
  typingIndicator.classList.add("message", "bot");
  typingIndicator.id = "typing-indicator";
  typingIndicator.innerHTML = `
    <div class="msg-avatar">AI</div>
    <div class="msg-content-wrapper">
      <div class="msg-bubble">
        <div class="typing-container">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    </div>
  `;
  chatBox.appendChild(typingIndicator);
  scrollToBottom();
}

function removeTypingIndicator() {
  if (typingIndicator) {
    typingIndicator.remove();
    typingIndicator = null;
  }
}

// Scroll chat area to bottom
function scrollToBottom() {
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Send message to local backend
async function sendMessage() {
  const userInput = userInputField.value.trim();
  if (!userInput) return;

  // Render User Message
  appendMessage("user", userInput);
  
  // Clear input
  userInputField.value = "";

  // Show Typing Indicator
  showTypingIndicator();

  try {
    const response = await fetch("http://localhost:3000/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // Send the sessionId so the backend links messages together.
      // If sessionId is null, the backend will auto-generate one and return it.
      body: JSON.stringify({
        message: userInput,
        sessionId: sessionId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    removeTypingIndicator();

    // Persist sessionId returned by the backend so all future messages
    // are linked to the same conversation memory.
    if (data.sessionId) {
      sessionId = data.sessionId;
      localStorage.setItem("travelgenie_session_id", sessionId);
    }
    
    // Render bot response
    if (data.text) {
      appendMessage("bot", data.text);
    } else {
      appendMessage("bot", "I received an empty response. Please try asking again.");
    }
  } catch (error) {
    console.error("Error chatting with Gemini API:", error);
    removeTypingIndicator();
    appendMessage("bot", "Oops! I encountered an issue connecting to the server.");
  }
}