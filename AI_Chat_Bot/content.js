// Constants
const ASSET_URL = {
  close: chrome.runtime.getURL("assets/delete.png"),
  send: chrome.runtime.getURL("assets/play.png"),
};
const CODING_DESC_CONTAINER_CLASS = "coding_desc_container__gdB9M";
const NEW_CHATBOT_BUTTON_CLASS = "py-4 px-3 coding_desc_container__gdB9M";
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

// ... (previous constants and basic functions remain the same)

// Chat history management with message type tracking
async function saveChatHistory(problemId, messages) {
  return new Promise((resolve) => {
    chrome.storage.local.set(
      {
        [`chat_${problemId}`]: messages,
        [`firstMessage_${problemId}`]: false,
      },
      resolve
    );
  });
}

async function isFirstMessage(problemId) {
  return new Promise((resolve) => {
    chrome.storage.local.get([`firstMessage_${problemId}`], (result) => {
      resolve(result[`firstMessage_${problemId}`] === undefined);
    });
  });
}

// Enhanced message formatting
function createInitialPrompt(problemId, userMessage) {
  const problemData = getProblemDataById(problemId);
  if (!problemData) return userMessage;

  let prompt = `I am helping with a coding problem. Here's the context:\n\n`;

  // Add problem information
  if (problemData.title) {
    prompt += `Problem: ${problemData.title}\n`;
  }
  if (problemData.difficulty) {
    prompt += `Difficulty: ${problemData.difficulty}\n`;
  }
  if (problemData.description) {
    prompt += `\nDescription:\n${problemData.description}\n`;
  }

  // Add examples if available
  if (problemData.examples && problemData.examples.length > 0) {
    prompt += `\nExamples:\n`;
    problemData.examples.forEach((example, index) => {
      prompt += `Example ${index + 1}:\n`;
      if (example.input) prompt += `Input: ${example.input}\n`;
      if (example.output) prompt += `Output: ${example.output}\n`;
      if (example.explanation)
        prompt += `Explanation: ${example.explanation}\n`;
      prompt += "\n";
    });
  }

  // Add constraints if available
  if (problemData.constraints) {
    prompt += `\nConstraints:\n${problemData.constraints}\n`;
  }

  // Add current code if available
  if (problemData.code) {
    prompt += `\nCurrent Code:\n${problemData.code}\n`;
  }

  // Add user's question
  prompt += `\nUser Question: ${userMessage}\n`;

  return prompt;
}

// Modified message handling
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
    const loadingDiv = document.createElement("div");
    loadingDiv.textContent = "AI is thinking...";
    loadingDiv.style.cssText = `
      padding: 10px;
      font-style: italic;
      color: #666;
      align-self: flex-start;
    `;
    chatMessages.appendChild(loadingDiv);

    // Check if this is the first message
    const isFirst = await isFirstMessage(problemId);
    const messageToSend = isFirst
      ? createInitialPrompt(problemId, message)
      : message;

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
                  text: messageToSend,
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

// ... (rest of the UI code remains the same)

// ... (previous constants remain the same)

// Chat history management
async function clearChatHistory(problemId) {
  return new Promise((resolve) => {
    chrome.storage.local.remove([`chat_${problemId}`], resolve);
  });
}

// ... (previous saveChatHistory and getChatHistory functions remain the same)
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

  // Chat header with toolbar
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

  // Title and toolbar container
  const headerLeft = document.createElement("div");
  headerLeft.innerText = "AI Helper";

  // Toolbar container
  const headerRight = document.createElement("div");
  headerRight.style.cssText = `
    display: flex;
    gap: 10px;
    align-items: center;
  `;

  // Clear history button
  const clearButton = document.createElement("button");
  clearButton.innerText = "Clear History";
  clearButton.style.cssText = `
    background-color: transparent;
    border: 1px solid white;
    color: white;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: background-color 0.2s;
    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }
  `;

  clearButton.addEventListener("click", async () => {
    const problemId = getCurrentProblemId();
    if (!problemId) return;

    if (
      confirm(
        "Are you sure you want to clear the chat history for this problem?"
      )
    ) {
      await clearChatHistory(problemId);
      const chatMessages = document.getElementById("chat-messages");
      chatMessages.innerHTML = "";
      chatMessages.appendChild(
        createMessageElement("Chat history has been cleared.", false)
      );
    }
  });

  // Close button
  const closeButton = document.createElement("img");
  closeButton.src = ASSET_URL.close;
  closeButton.style.cssText = `
    width: 20px;
    height: 20px;
    cursor: pointer;
    margin-left: 10px;
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

  // Assemble header components
  headerRight.appendChild(clearButton);
  headerRight.appendChild(closeButton);
  chatHeader.appendChild(headerLeft);
  chatHeader.appendChild(headerRight);

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

  // Input container - This was missing in the original code
  const inputContainer = document.createElement("div");
  inputContainer.style.cssText = `
    display: flex;
    padding: 15px;
    gap: 10px;
    border-top: 1px solid #eee;
    background-color: white;
  `;

  // Input field
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

  // Send button
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

  // Assemble input container
  inputContainer.appendChild(chatInput);
  inputContainer.appendChild(sendButton);

  // Assemble the complete chat interface
  chatContainer.appendChild(chatHeader);
  chatContainer.appendChild(chatMessages);
  chatContainer.appendChild(inputContainer);

  const codingDescContainer = document.getElementsByClassName(
    CODING_DESC_CONTAINER_CLASS
  )[0];
  if (codingDescContainer) {
    codingDescContainer.appendChild(chatContainer);
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
  aiHelperButton.id = AI_HELPER_BUTTON_ID;
  aiHelperButton.className =
    "ant-btn css-19gw05y ant-btn-default Button_gradient_light_button__ZDAR_ gap-1 overflow-hidden";

  // Create flex container for button content
  const buttonContent = document.createElement("div");
  buttonContent.style.display = "flex";
  buttonContent.style.alignItems = "center";
  buttonContent.style.gap = "8px";

  // Create icon element
  const icon = document.createElement("i");
  icon.className = "fas fa-robot";
  icon.style.color = "#3568af";

  // Create text span
  const buttonText = document.createElement("span");
  buttonText.innerText = "AI Helper";
  buttonText.style.cssText = `
    color: #3568af;
    opacity: 0;
    width: 0;
    overflow: hidden;
    transition: all 0.3s ease;
    white-space: nowrap;
  `;

  // Add icon and text to button content
  buttonContent.appendChild(icon);
  buttonContent.appendChild(buttonText);
  aiHelperButton.appendChild(buttonContent);

  // Style the button to match existing styles while keeping square shape
  aiHelperButton.style.cssText = `
    background: linear-gradient(to right, #dfeaff, white);
    border: none;
    border-radius: 5px;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(53, 104, 175, 0.2);
    width: 54px;
    height: 42px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  // Add hover effects
  aiHelperButton.addEventListener("mouseenter", () => {
    aiHelperButton.style.width = "130px";
    aiHelperButton.style.padding = "0 12px";
    buttonText.style.opacity = "1";
    buttonText.style.width = "auto";
    aiHelperButton.style.boxShadow = "0 4px 12px rgba(53, 104, 175, 0.3)";
  });

  aiHelperButton.addEventListener("mouseleave", () => {
    aiHelperButton.style.width = "40px";
    aiHelperButton.style.padding = "0";
    buttonText.style.opacity = "0";
    buttonText.style.width = "0";
    aiHelperButton.style.boxShadow = "0 2px 8px rgba(53, 104, 175, 0.2)";
  });

  // Add click handler
  aiHelperButton.addEventListener("click", () => {
    aiHelperButton.style.display = "none";
    const existingChat = document.getElementById(CHAT_CONTAINER_ID);
    if (!existingChat) {
      injectChatInterface();
    }
  });

  // Find the container and the flex row that contains the Ask Doubt button
  const codingDescContainer = document.getElementsByClassName(
    CODING_DESC_CONTAINER_CLASS
  )[0];
  if (codingDescContainer) {
    const flexRow = codingDescContainer.querySelector(
      ".d-flex.align-items-start.align-items-sm-center.justify-content-between.flex-column.flex-sm-row"
    );
    if (flexRow) {
      // Add button to the same row as Ask Doubt button
      flexRow.appendChild(aiHelperButton);
    }
  }

  // Add FontAwesome if not already present
  if (!document.querySelector('link[href*="fontawesome"]')) {
    const fontAwesome = document.createElement("link");
    fontAwesome.rel = "stylesheet";
    fontAwesome.href =
      "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css";
    document.head.appendChild(fontAwesome);
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
