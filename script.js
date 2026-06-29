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

// Function to format text (handles simple markdown: images, links, list items, and tags)
function formatMessage(text) {
  if (!text) return "";

  // 1. Escape HTML entities to prevent XSS (before injecting HTML tags)
  let formatted = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 2. Parse Markdown Images: ![alt description](url)
  formatted = formatted.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, url) => {
    const cleanUrl = url.trim().replace(/&amp;/g, "&");
    const cleanAlt = alt.trim() || "Attraction Image";
    const escapedAlt = cleanAlt.replace(/'/g, "\\'");
    // Return a responsive image container. If image fails to load, it will attempt a self-healing fallback to Wikipedia pageimages, else hide cleanly.
    return `<div class="chat-image-container">
              <img src="${cleanUrl}" alt="${cleanAlt}" class="chat-image" referrerpolicy="no-referrer" onload="this.classList.add('loaded');" onerror="if(!this.dataset.fallback){this.dataset.fallback=true; this.src='https://travelgenie-ai-6fyo.onrender.com/api/image?q=' + encodeURIComponent('${escapedAlt}');}else{this.parentNode.style.display='none';}" />
              <div class="chat-image-caption">${cleanAlt}</div>
            </div>`;
  });

  // 3. Parse Markdown Links: [label](url)
  formatted = formatted.replace(/\[(.*?)\]\((.*?)\)/g, (match, label, url) => {
    const cleanUrl = url.trim().replace(/&amp;/g, "&");
    const cleanLabel = label.trim();
    return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="chat-link">${cleanLabel}</a>`;
  });

  // 4. Parse Bold: **text**
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // 5. Parse Italic: *text*
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // 6. Convert bullet points: lines starting with "-" or "*" followed by a space
  formatted = formatted.replace(/^\s*[-*]\s+(.*?)$/gm, '• $1');

  // 7. Convert newlines to break tags
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
    const response = await fetch("https://travelgenie-ai-6fyo.onrender.com/chat", {
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