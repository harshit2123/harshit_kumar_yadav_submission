document.addEventListener("DOMContentLoaded", function () {
  const saveButton = document.getElementById("saveButton");
  const removeButton = document.getElementById("removeButton");
  const apiKeyInput = document.getElementById("apiKey");
  const status = document.getElementById("status");

  // Load saved API key
  chrome.storage.local.get(["geminiApiKey"], function (result) {
    console.log("Retrieved API key:", result);
    if (result.geminiApiKey) {
      apiKeyInput.value = result.geminiApiKey;
    }
  });

  // Function to show status message
  function showStatus(message, isError = false) {
    status.textContent = message;
    status.className = `status ${isError ? "error" : "success"}`;
    status.style.display = "block";

    setTimeout(() => {
      status.style.display = "none";
    }, 2000);
  }

  // Save API key
  saveButton.addEventListener("click", function () {
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      showStatus("Please enter an API key", true);
      return;
    }

    chrome.storage.local.set({ geminiApiKey: apiKey }, function () {
      showStatus("Settings saved successfully!");

      // Notify content script that API key has been updated
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0]) {
          chrome.tabs
            .sendMessage(tabs[0].id, {
              type: "API_KEY_UPDATED",
              apiKey: apiKey,
            })
            .catch(() => {}); // Ignore errors if content script is not ready
        }
      });
    });
  });

  // Remove API key
  removeButton.addEventListener("click", function () {
    chrome.storage.local.remove(["geminiApiKey"], function () {
      apiKeyInput.value = "";
      showStatus("API key removed successfully!");

      // Notify content script that API key has been removed
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs[0]) {
          chrome.tabs
            .sendMessage(tabs[0].id, {
              type: "API_KEY_REMOVED",
            })
            .catch(() => {}); // Ignore errors if content script is not ready
        }
      });
    });
  });
});
