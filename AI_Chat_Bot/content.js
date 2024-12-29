const ASSET_URL = {
  close: chrome.runtime.getURL("assets/delete.png"),
  send: chrome.runtime.getURL("assets/play.png"),
};

const CODING_DESC_CONTAINER_CLASS = "coding_desc_container__gdB9M";
const AI_HELPER_BUTTON_ID = "ai-helper-button";
const CHAT_CONTAINER_ID = "ai-helper-chat-container";

let lastVisitedPage = "";

// Set up the MutationObserver
const observer = new MutationObserver(() => {
  handleContentChange();
});

// Start observing the body for DOM changes
observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Initial check when the DOM is fully loaded
window.addEventListener("DOMContentLoaded", () => {
  handleContentChange();
});

function handleContentChange() {
  if (isPageChange()) handlePageChange();
}

function isPageChange() {
  const currentPath = window.location.pathname;
  if (lastVisitedPage === currentPath) return false;
  lastVisitedPage = currentPath;
  return true;
}

function handlePageChange() {
  if (isProblemsRoute()) {
    cleanUpPage();
    addAIHelperButton();
  }
}

function isProblemsRoute() {
  const currentPath = window.location.pathname;
  return (
    currentPath.startsWith("/problems/") &&
    currentPath.length > "/problems/".length
  );
}

function cleanUpPage() {
  const existingButton = document.getElementById(AI_HELPER_BUTTON_ID);
  const existingChat = document.getElementById(CHAT_CONTAINER_ID);
  if (existingButton) existingButton.remove();
  if (existingChat) existingChat.remove();
}

function addAIHelperButton() {
  const aiHelperButton = document.createElement("button");
  aiHelperButton.innerText = "AI Helper";
  aiHelperButton.id = AI_HELPER_BUTTON_ID;

  aiHelperButton.style.cssText = `
    padding: 10px 20px;
    font-size: 16px;
    background-color: #007BFF;
    color: #FFFFFF;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    z-index: 10000;
    margin-top: 15px;
    margin-bottom: 15px;
  `;

  aiHelperButton.addEventListener("click", () => {
    aiHelperButton.style.display = "none";
    const existingChat = document.getElementById(CHAT_CONTAINER_ID);
    if (!existingChat) {
      injectChatInterface();
    }
  });

  const codingDescContainer = document.getElementsByClassName(
    CODING_DESC_CONTAINER_CLASS
  )[0];
  if (codingDescContainer) {
    codingDescContainer.appendChild(aiHelperButton);
  }
}

function injectChatInterface() {
  // Create main chat container
  const chatContainer = document.createElement("div");
  chatContainer.id = CHAT_CONTAINER_ID;
  chatContainer.style.cssText = `
    width: 100%;
    height: 400px;
    background-color: white;
    border-radius: 10px;
    box-shadow: 0 0 10px rgba(0,0,0,0.1);
    display: flex;
    flex-direction: column;
    margin-top: 15px;
    margin-bottom: 15px;
  `;

  // Create chat header
  const chatHeader = document.createElement("div");
  chatHeader.style.cssText = `
    padding: 15px;
    background-color: #007BFF;
    color: white;
    border-radius: 10px 10px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    z-index: 1;
  `;
  chatHeader.innerText = "AI Helper";

  // Create close button
  const closeButton = document.createElement("img");
  closeButton.src = ASSET_URL.close;
  closeButton.style.cssText = `
    width: 20px;
    height: 20px;
    cursor: pointer;
  `;

  closeButton.addEventListener("click", () => {
    chatContainer.remove();
    const aiHelperButton = document.getElementById(AI_HELPER_BUTTON_ID);
    if (aiHelperButton) {
      aiHelperButton.style.display = "block";
    } else {
      addAIHelperButton();
    }
  });
  chatHeader.appendChild(closeButton);

  // Create messages container
  const chatMessages = document.createElement("div");
  chatMessages.id = "chat-messages";
  chatMessages.style.cssText = `
    flex-grow: 1;
    overflow-y: auto;
    padding: 15px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background-color: #f8f9fa;
  `;

  // Create input container
  const inputContainer = document.createElement("div");
  inputContainer.style.cssText = `
    display: flex;
    padding: 15px;
    gap: 10px;
    border-top: 1px solid #eee;
    background-color: white;
  `;

  // Create input field
  const chatInput = document.createElement("input");
  chatInput.id = "chat-input";
  chatInput.placeholder = "Type your message...";
  chatInput.style.cssText = `
    flex-grow: 1;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 5px;
    outline: none;
  `;

  // Create send button
  const sendButton = document.createElement("img");
  sendButton.src = ASSET_URL.send;
  sendButton.style.cssText = `
    width: 30px;
    height: 30px;
    cursor: pointer;
  `;
  sendButton.addEventListener("click", handleSendMessage);

  // Handle enter key press
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  });

  // Assemble the chat interface
  inputContainer.appendChild(chatInput);
  inputContainer.appendChild(sendButton);
  chatContainer.appendChild(chatHeader);
  chatContainer.appendChild(chatMessages);
  chatContainer.appendChild(inputContainer);

  // Get the container and insert chat
  const codingDescContainer = document.getElementsByClassName(
    CODING_DESC_CONTAINER_CLASS
  )[0];
  if (codingDescContainer) {
    codingDescContainer.appendChild(chatContainer);
  }

  // Focus the input field
  chatInput.focus();
}

async function handleSendMessage() {
  const chatInput = document.getElementById("chat-input");
  const chatMessages = document.getElementById("chat-messages");
  const userMessage = chatInput.value.trim();

  if (!userMessage) return;

  // Add user message
  const userMessageElement = document.createElement("div");
  userMessageElement.style.cssText = `
    align-self: flex-end;
    background-color: #007BFF;
    color: white;
    padding: 10px 15px;
    border-radius: 15px 15px 0 15px;
    max-width: 80%;
    word-wrap: break-word;
  `;
  userMessageElement.innerText = userMessage;
  chatMessages.appendChild(userMessageElement);

  // Clear input
  chatInput.value = "";

  try {
    // Get bot reply (placeholder)
    const botReply =
      "This is a placeholder response. Implement your API call here.";

    // Add bot message
    const botMessageElement = document.createElement("div");
    botMessageElement.style.cssText = `
      align-self: flex-start;
      background-color: #f0f0f0;
      color: black;
      padding: 10px 15px;
      border-radius: 15px 15px 15px 0;
      max-width: 80%;
      word-wrap: break-word;
    `;
    botMessageElement.innerText = botReply;
    chatMessages.appendChild(botMessageElement);
  } catch (error) {
    console.error("Error:", error);
  }

  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
