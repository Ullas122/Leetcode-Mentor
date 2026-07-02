# LeetCode Mentor

LeetCode Mentor is a browser extension that adds a small AI-powered assistant to LeetCode problem pages. It helps you think through a problem without directly giving away the full solution.

## What the extension does

- Injects a floating “Mentor” panel into LeetCode problem pages
- Lets you ask for:
  - a hint or approach
  - feedback on your current logic
  - a follow-up question about the problem
- Uses your own Groq API key to connect to an AI model
- Stores the API key locally in the browser for later use

## Project files

- manifest.json: Chrome/Edge extension manifest
- content.js: main logic for injecting the panel and sending requests
- content.css: styling for the mentor UI
- puter.js: additional helper script (currently not used by the extension flow)
- icons/: icon assets for the extension

## How it works

1. The extension watches LeetCode problem pages using the manifest content script.
2. When you open a problem page, it injects a floating panel into the page.
3. The panel asks for a Groq API key the first time you use it.
4. After the key is saved, you can:
   - click “Get Approach” for a high-level hint
   - click “Review Logic” to review your current code
   - type a custom question and click “Ask”
5. The extension sends the page context and your current editor code to the AI service, then displays a concise response in the panel.

## How to install it on your system

### 1) Prerequisites

- A modern Chromium-based browser such as Google Chrome, Microsoft Edge, or Brave
- A Groq API key
  - Create one at: https://console.groq.com/keys

### 2) Load the extension in your browser

For Google Chrome or Microsoft Edge:

1. Open your browser and go to:
   - Chrome: chrome://extensions
   - Edge: edge://extensions
2. Turn on “Developer mode” in the top-right corner.
3. Click “Load unpacked”.
4. Select the folder containing this project:
   - C:\Users\Ullas\OneDrive\Documents\Leetcode-mentor
5. The extension should appear in your extensions list.

### 3) Use the extension

1. Open any LeetCode problem page.
2. You should see a floating “Mentor” button.
3. Click it.
4. Enter your Groq API key when prompted.
5. Click “Save”.
6. Use the buttons to ask for hints or review your logic.

## Important notes

- The extension only runs on LeetCode problem pages matching the manifest rule.
- Your API key is stored in the browser’s local storage, not in the repository.
- If the API key is invalid or removed, the panel will ask you to re-enter it.

## How to update the extension

After making changes to the files:

1. Go to the browser extension page.
2. Click the refresh icon for “LeetCode Mentor”.
3. Reload your LeetCode page.

## How to run locally in development

If you want to modify the extension:

1. Edit the files in this folder.
2. Reload the extension in your browser.
3. Refresh the LeetCode page to test the new behavior.

## Security note

This project uses the browser’s local storage to save the API key. Do not share your API key publicly or commit it into a repository.


