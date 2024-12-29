// Constants
const ASSET_URL = {
  close: chrome.runtime.getURL("assets/delete.png"),
  send: chrome.runtime.getURL("assets/play.png"),
};
const CODING_DESC_CONTAINER_CLASS = "coding_desc_container__gdB9M";
const AI_HELPER_BUTTON_ID = "ai-helper-button";
const CHAT_CONTAINER_ID = "ai-helper-chat-container";

// Chat history management
async function saveChatHistory(problemId, messages) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [`chat_${problemId}`]: messages }, resolve);
  });
}

async function getChatHistory(problemId) {
  return new Promise((resolve) => {
    chrome.storage.local.get([`chat_${problemId}`], (result) => {
      resolve(result[`chat_${problemId}`] || []);
    });
  });
}

function getCurrentProblemId() {
  const idMatch = window.location.pathname.match(/-(\d+)$/);
  return idMatch ? idMatch[1] : null;
}

const problemDataMap = new Map();

// Listen for XHR data
window.addEventListener("xhrDataFetched", (event) => {
  const data = event.detail;
  if (
    data.url &&
    data.url.match(/https:\/\/api2\.maang\.in\/problems\/user\/\d+/)
  ) {
    const idMatch = data.url.match(/\/(\d+)$/);
    if (idMatch) {
      const id = idMatch[1];
      try {
        const responseData = JSON.parse(data.response);
        problemDataMap.set(id, responseData);
        console.log(`Stored data for Problem ID ${id}:`, responseData);
      } catch (error) {
        console.error(`Error parsing response for Problem ID ${id}:`, error);
      }
    }
  }
});

function getProblemDataById(id) {
  if (id && problemDataMap.has(id)) {
    return problemDataMap.get(id);
  }
  console.log(`No data found for Problem ID ${id}`);
  return null;
}

// Enhanced message formatting for AI
function formatMessageForAI(message, problemId) {
  const problemData = getProblemDataById(problemId);

  let formattedMessage = `Context:\n`;

  if (problemData) {
    formattedMessage += `Problem Title: ${problemData.title || "N/A"}\n`;
    formattedMessage += `Difficulty: ${problemData.difficulty || "N/A"}\n`;
    formattedMessage += `Problem Description: ${
      problemData.description || "N/A"
    }\n\n`;

    if (problemData.examples) {
      formattedMessage += `Examples:\n`;
      problemData.examples.forEach((example, index) => {
        formattedMessage += `Example ${index + 1}:\n`;
        formattedMessage += `Input: ${example.input}\n`;
        formattedMessage += `Output: ${example.output}\n`;
        if (example.explanation) {
          formattedMessage += `Explanation: ${example.explanation}\n`;
        }
        formattedMessage += "\n";
      });
    }
  }

  formattedMessage += `User Question:\n${message}`;

  return formattedMessage;
}

// API key management
async function checkApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["geminiApiKey"], function (result) {
      resolve(result.geminiApiKey);
    });
  });
}

// Chat interface
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

async function loadChatHistory(chatMessages) {
  const problemId = getCurrentProblemId();
  if (!problemId) return;

  const history = await getChatHistory(problemId);
  history.forEach((message) => {
    chatMessages.appendChild(
      createMessageElement(message.text, message.isUser)
    );
  });
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function handleSendMessage() {
  const chatInput = document.getElementById("chat-input");
  const chatMessages = document.getElementById("chat-messages");
  const message = chatInput.value.trim();
  const problemId = getCurrentProblemId();

  if (!message || !problemId) return;

  const apiKey = await checkApiKey();
  if (!apiKey) {
    chatMessages.appendChild(
      createMessageElement(
        "Please set your Gemini API key in the extension popup first.",
        false
      )
    );
    return;
  }

  // Save and display user message
  const history = await getChatHistory(problemId);
  history.push({ text: message, isUser: true });
  await saveChatHistory(problemId, history);
  chatMessages.appendChild(createMessageElement(message, true));
  chatInput.value = "";

  try {
    // Loading indicator
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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
    chatMessages.removeChild(loadingDiv);

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      const aiResponse = data.candidates[0].content.parts[0].text;
      // Save and display AI response
      history.push({ text: aiResponse, isUser: false });
      await saveChatHistory(problemId, history);
      chatMessages.appendChild(createMessageElement(aiResponse, false));
    } else {
      throw new Error(data.error?.message || "Invalid API response");
    }
  } catch (error) {
    console.error("Error:", error);
    chatMessages.appendChild(
      createMessageElement(
        `Sorry, I encountered an error: ${error.message}`,
        false
      )
    );
  }

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function injectChatInterface() {
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

  // Chat header
  const chatHeader = document.createElement("div");
  chatHeader.style.cssText = `
    padding: 15px;
    background-color: #007BFF;
    color: white;
    border-radius: 10px 10px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;
  chatHeader.innerText = "AI Helper";

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

  // Messages container
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

  // Input container
  const inputContainer = document.createElement("div");
  inputContainer.style.cssText = `
    display: flex;
    padding: 15px;
    gap: 10px;
    border-top: 1px solid #eee;
    background-color: white;
  `;

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

  const sendButton = document.createElement("img");
  sendButton.src = ASSET_URL.send;
  sendButton.style.cssText = `
    width: 30px;
    height: 30px;
    cursor: pointer;
  `;

  sendButton.addEventListener("click", handleSendMessage);
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  });

  inputContainer.appendChild(chatInput);
  inputContainer.appendChild(sendButton);

  chatContainer.appendChild(chatHeader);
  chatContainer.appendChild(chatMessages);
  chatContainer.appendChild(inputContainer);

  const codingDescContainer = document.getElementsByClassName(
    CODING_DESC_CONTAINER_CLASS
  )[0];
  if (codingDescContainer) {
    codingDescContainer.appendChild(chatContainer);
    // Load existing chat history
    loadChatHistory(chatMessages);
  }

  chatInput.focus();
}

// Page handling functions
let lastVisitedPage = "";

function isPageChange() {
  const currentPath = window.location.pathname;
  if (lastVisitedPage === currentPath) return false;
  lastVisitedPage = currentPath;
  return true;
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

function handleContentChange() {
  if (isPageChange()) handlePageChange();
}

function handlePageChange() {
  if (isProblemsRoute()) {
    cleanUpPage();
    addAIHelperButton();
  }
}

// Initialize
const observer = new MutationObserver(() => {
  handleContentChange();
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

window.addEventListener("DOMContentLoaded", () => {
  handleContentChange();
});
