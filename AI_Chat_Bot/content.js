const codingDescriptionContainerClass =
  "py-4 px-3 coding_desc_container__gdB9M";

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
  const existingbutton = document.getElementById("ai-helper-button");
  if (existingbutton) existingbutton.remove();
}

function addAIHelperButton() {
  const aiHelperButton = document.createElement("button");
  aiHelperButton.innerText = "AI Helper";
  aiHelperButton.id = "ai-helper-button";

  aiHelperButton.style.padding = "10px 20px";
  aiHelperButton.style.fontSize = "16px";
  aiHelperButton.style.backgroundColor = "#007BFF";
  aiHelperButton.style.color = "#FFFFFF";
  aiHelperButton.style.border = "none";
  aiHelperButton.style.borderRadius = "5px";
  aiHelperButton.style.cursor = "pointer";
  aiHelperButton.style.zIndex = "10000";

  // Add a click event listener
  aiHelperButton.addEventListener("click", () => {
    alert("Chatbot will open here!"); // Placeholder for chatbot opening logic
  });

  // Append the button to the specific container
  const codingDescContainer = document.getElementsByClassName(
    codingDescriptionContainerClass
  )[0];
  if (!codingDescContainer) {
    console.error(
      "Target container not found:",
      codingDescriptionContainerClass
    );
    return;
  }
  if (!document.getElementById("ai-helper-button")) {
    codingDescContainer.insertAdjacentElement("beforeend", aiHelperButton);
  }
}
