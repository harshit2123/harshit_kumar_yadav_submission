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
    background-color: ${isUser ? "#daf4fd" : "#e9ecef"};
    color: ${isUser ? "black" : "black"};
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
    border: 2px solid #dcf5fe;
  `;

  // Chat header with toolbar
  const chatHeader = document.createElement("div");
  chatHeader.style.cssText = `
    padding: 15px;
    background-color: #dcf5fe;
    color: #18294f;
    border-radius: 8px 8px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;

  // Title and toolbar container with white background box
  const headerLeft = document.createElement("div");
  headerLeft.style.cssText = `
    display: flex;
    align-items: center;
    background-color: white;
    padding: 8px 12px;
    border-radius: 10px;
    gap: 8px;
  `;

  // Add robot icon
  const robotIcon = document.createElement("i");
  robotIcon.className = "fas fa-robot";
  robotIcon.style.color = "#18294f";

  // Add title text
  const titleText = document.createElement("span");
  titleText.innerText = "AI HELPER";
  titleText.style.cssText = `
    color: #18294f;
    font-weight: bold;
    font-size: 14px;
  `;

  // Assemble header left
  headerLeft.appendChild(robotIcon);
  headerLeft.appendChild(titleText);

  // Toolbar container
  const headerRight = document.createElement("div");
  headerRight.style.cssText = `
    display: flex;
    gap: 10px;
    align-items: center;
  `;

  // Clear history button
  // ... (previous code remains the same until clear button)

  // Clear history button
  const clearButton = document.createElement("button");
  clearButton.innerText = "Clear Chat";
  clearButton.style.cssText = `
    background-color: white;
    border: none;
    color: #18294f;
    padding: 8px 12px;
    border-radius: 10px;
    cursor: pointer;
    font-size: 12px;
    font-weight: bold;
    transition: all 0.2s;
    opacity: 1;
    height: fit-content;
    /* Note: CSS classes are not directly applicable through style.cssText, 
       they are typically added via className or classList */
    &:hover {
      background-color: #f8f9fa;
    }
  `;

  // Classes can be added like this:
  clearButton.className =
    "ant-btn css-19gw05y ant-btn-default Button_gradient_light_button__ZDAR_ px-3 px-sm-4 py-2 flex";

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

  // Close button with icon
  const closeButton = document.createElement("button");
  closeButton.style.cssText = `
  background-color: white;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  height: fit-content; /* Added */
  &:hover {
    background-color: #f8f9fa;
  }
`;

  // Classes can be added like this:
  closeButton.className =
    "ant-btn css-19gw05y ant-btn-default Button_gradient_light_button__ZDAR_ px-3 px-sm-4 py-2 flex";

  // Using Font Awesome close icon instead of image
  const closeIcon = document.createElement("i");
  closeIcon.className = "fas fa-times";
  closeIcon.style.cssText = `
  color: #18294f;
  font-size: 20px;
  font-weight: bold;
`;

  // ... (rest of the code remains the same)

  closeButton.appendChild(closeIcon);
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

  // Input container
  const inputContainer = document.createElement("div");
  inputContainer.style.cssText = `
    display: flex;
    padding: 15px;
    gap: 10px;
    border-top: 1px solid #dcf5fe;
    background-color: white;
    border-bottom-left-radius: 10px;  /* Add bottom-left radius */
    border-bottom-right-radius: 10px; /* Add bottom-right radius */
  `;

  // Input field
  const chatInput = document.createElement("input");
  chatInput.id = "chat-input";
  chatInput.placeholder = "Type your message...";
  chatInput.style.cssText = `
    flex-grow: 1;
    padding: 8px;
    border: 1px solid #ffffff;
    border-radius: 10px;
    outline: none;
    &:focus {
      border-color: #18294f;
    }
  `;

  // Send button
  const sendButton = document.createElement("button");
  sendButton.style.cssText = `
    background: none;
    border: none;
    cursor: pointer;
    padding: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  const sendIcon = document.createElement("i");
  sendIcon.className = "fas fa-paper-plane";
  sendIcon.style.cssText = `
    color: #18294f;
    font-size: 20px;
  `;

  sendButton.appendChild(sendIcon);
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

  // Add FontAwesome if not already present
  if (!document.querySelector('link[href*="fontawesome"]')) {
    const fontAwesome = document.createElement("link");
    fontAwesome.rel = "stylesheet";
    fontAwesome.href =
      "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css";
    document.head.appendChild(fontAwesome);
  }

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

  // Store the default button styles in a constant
  const DEFAULT_BUTTON_STYLES = `
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

  // Function to reset button to default state
  const resetButtonState = () => {
    aiHelperButton.style.cssText = DEFAULT_BUTTON_STYLES;
    buttonText.style.opacity = "0";
    buttonText.style.width = "0";
  };

  // Initial button styling
  resetButtonState();

  // Add hover effects
  aiHelperButton.addEventListener("mouseenter", () => {
    aiHelperButton.style.width = "130px";
    aiHelperButton.style.padding = "0 12px";
    buttonText.style.opacity = "1";
    buttonText.style.width = "auto";
    aiHelperButton.style.boxShadow = "0 4px 12px rgba(53, 104, 175, 0.3)";
  });

  aiHelperButton.addEventListener("mouseleave", () => {
    resetButtonState();
  });

  // Add click handler
  aiHelperButton.addEventListener("click", () => {
    aiHelperButton.style.display = "none";
    const existingChat = document.getElementById(CHAT_CONTAINER_ID);
    if (!existingChat) {
      injectChatInterface();
    }
  });

  // Function to show the button
  const showButton = () => {
    aiHelperButton.style.display = "flex";
    resetButtonState();
  };

  // Add event listener for chat close if you have a close button
  // Assuming you have a chat close button with id 'chatCloseButton'
  document.addEventListener("chatClosed", () => {
    showButton();
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
      // Insert AI Helper button before the Ask Doubt button
      const askDoubtButton = flexRow.querySelector(
        ".coding_ask_doubt_button__FjwXJ"
      );
      if (askDoubtButton) {
        flexRow.insertBefore(aiHelperButton, askDoubtButton);
      } else {
        flexRow.appendChild(aiHelperButton);
      }
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

  // Return the showButton function so it can be called from the chat interface
  return showButton;
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
