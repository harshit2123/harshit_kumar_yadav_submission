# ReadMe

## Demo Video Link for the Chrome Extension. 
  https://drive.google.com/file/d/1cy2D-lzPTYwFHiJWvVJM-K2fWncqDuBs/view?usp=sharing

## Features

1. **MVP Implementation**  
   - The MVP can open a popup to input your API key.  
   - Once saved, a button is dynamically added to the DOM for accessing the chatbot.  
   - The chatbot allows sending and receiving messages seamlessly.

2. **API Key Input**  
   - Added a feature to securely input your personal API key directly in the HTML popup.

3. **Dynamic Chatbox**  
   - The chatbot box is fully dynamic and reshapes itself based on the DOM size for an optimized user experience.

4. **Persistent Chat History**  
   - Chat history is stored for each problem ID, ensuring conversations don’t disappear upon reloading.

5. **Clear Chat Feature**  
   - Includes a button to clear the chat history if needed.

6. **Automatic Context Provision**  
   - Automatically provides the problem context to the AI in the first message. Subsequent messages contain only user inputs for clarity.
     
7. **Readable Message Code**  
   - Automatically renders the message elements code , so that it becomes readable and also highlights the important part in the message element.
   
8. **Added the Generative Chat Feature 
   - chat can remember the previous messages to it, so that it can remember the Previous Conversation  

---

## How To Use

1. **Enter Your API Key**  
   - Click on the extension icon to open the popup.  
   - Input your personal API key and click **Save**.  

2. **Open the Chatbot**  
   - Click on the **AI Helper** button dynamically added to the DOM to open the chatbox.  

3. **Start Chatting**  
   - Type your prompts and questions in the chatbox.  
   - The chatbot will respond to your queries dynamically, using the provided context.
