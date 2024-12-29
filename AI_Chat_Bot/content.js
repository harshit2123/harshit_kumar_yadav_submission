const ASSET_URL = {
  close: chrome.runtime.getURL("assets/delete.png"),
  send: chrome.runtime.getURL("assets/play.png"),
};

const CODING_DESC_CONTAINER_CLASS = "coding_desc_container__gdB9M";
const AI_HELPER_BUTTON_ID = "ai-helper-button";
const CHAT_CONTAINER_ID = "ai-helper-chat-container";
let currentApiKey = null;
//const API_KEY = "AIzaSyA2Lm42bdlP5o7ZDr3Fkhb4JGB2nav1cxc"; // Note: Should be stored securely

// Listen for API key updates from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "API_KEY_UPDATED") {
    currentApiKey = message.apiKey;
    console.log("API key updated in content script");
  } else if (message.type === "API_KEY_REMOVED") {
    currentApiKey = null;
    console.log("API key removed from content script");
  }
});
// Add this function near your other functions
function checkApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["geminiApiKey"], function (result) {
      currentApiKey = result.geminiApiKey;
      resolve(currentApiKey);
    });
  });
}

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

// Add message display functions
function createMessageElement(text, isUser = false) {
  const messageDiv = document.createElement("div");
  messageDiv.style.cssText = `
    padding: 10px;
    border-radius: 10px;
    max-width: 70%;
    margin: ${isUser ? "5px 5px 5px auto" : "5px auto 5px 5px"};
    background-color: ${isUser ? "#007BFF" : "#e9ecef"};
    color: ${isUser ? "white" : "black"};
  `;
  messageDiv.textContent = text;
  return messageDiv;
}

// Handle sending messages and getting responses
// Remove the const API_KEY declaration from the top
// Instead, add this modified handleSendMessage function:

async function handleSendMessage() {
  const chatInput = document.getElementById("chat-input");
  const chatMessages = document.getElementById("chat-messages");
  const message = chatInput.value.trim();

  if (!message) return;

  // Check for API key
  const apiKey = await checkApiKey();

  if (!apiKey) {
    chatMessages.appendChild(
      createMessageElement(
        "Please set your Gemini API key in the extension popup first. Click the extension icon in your browser toolbar to set it up.",
        false
      )
    );
    return;
  }

  // Display user message
  chatMessages.appendChild(createMessageElement(message, true));
  chatInput.value = "";

  try {
    // Show loading indicator
    const loadingDiv = document.createElement("div");
    loadingDiv.textContent = "AI is thinking...";
    loadingDiv.style.cssText = `
          padding: 10px;
          font-style: italic;
          color: #666;
          align-self: flex-start;
      `;
    chatMessages.appendChild(loadingDiv);

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${currentApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: message,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    // Remove loading indicator
    chatMessages.removeChild(loadingDiv);

    // Handle API response
    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      const aiResponse = data.candidates[0].content.parts[0].text;
      chatMessages.appendChild(createMessageElement(aiResponse, false));
    } else {
      if (data.error) {
        // Handle specific API errors
        chatMessages.appendChild(
          createMessageElement(
            `Error: ${data.error.message || "Invalid API response"}`,
            false
          )
        );
      } else {
        throw new Error("Invalid API response");
      }
    }
  } catch (error) {
    console.error("Error:", error);
    chatMessages.appendChild(
      createMessageElement(
        "Sorry, I encountered an error. Please try again. " +
          (error.message === "Failed to fetch"
            ? "Please check your internet connection and API key."
            : error.message),
        false
      )
    );
  }

  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

window.addEventListener("xhrDataFetched", function (event) {
  const data = event.detail;
  console.log("Received data in content.js", data);
});

// function to handle script
function addInjectScript() {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("inject.js");
  document.documentElement.insertAdjacentElement("afterbegin", script);
  script.remove();
}

// function to handle the apikey from the popup ""
document.addEventListener("DOMContentLoaded", function () {
  // Load saved API key
  chrome.storage.local.get(["geminiApiKey"], function (result) {
    if (result.geminiApiKey) {
      document.getElementById("apiKey").value = result.geminiApiKey;
    }
  });

  // Save API key
  document.getElementById("saveButton").addEventListener("click", function () {
    const apiKey = document.getElementById("apiKey").value.trim();
    const status = document.getElementById("status");

    if (!apiKey) {
      status.textContent = "Please enter an API key";
      status.className = "status error";
      status.style.display = "block";
      return;
    }

    chrome.storage.local.set({ geminiApiKey: apiKey }, function () {
      status.textContent = "Settings saved successfully!";
      status.className = "status success";
      status.style.display = "block";

      // Hide the success message after 2 seconds
      setTimeout(() => {
        status.style.display = "none";
      }, 2000);
    });
  });
});
