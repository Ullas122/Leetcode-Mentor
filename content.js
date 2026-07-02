// 1. Build the UI HTML
const mentorHTML = `
  <button id="mentor-trigger">Mentor</button>
  
  <div id="mentor-panel">
    <div id="mentor-header">
      <span>AI Coding Mentor</span>
      <button id="mentor-close">✕</button>
    </div>
    
    <div id="mentor-output">
      Awaiting problem analysis.
    </div>
    
    <div id="mentor-controls">
      <div id="mentor-setup" style="display: none;">
        <div class="mentor-input-group">
          <input type="text" id="mentor-api-key" placeholder="Enter Groq API Key">
          <button id="mentor-save-key">Save</button>
        </div>
      </div>

      <div id="mentor-tools" style="display: none;">
        <div class="mentor-input-group">
          <input type="text" id="mentor-idea" placeholder="Propose an approach or ask a follow-up...">
          <button id="mentor-submit-idea">Ask</button>
        </div>
        
        <div class="mentor-button-grid">
          <button id="mentor-hint-btn" class="mentor-btn-primary">Get Approach</button>
          <button id="mentor-review-btn" class="mentor-btn-secondary">Review Logic</button>
        </div>
        
        <button id="mentor-reset-key" style="margin-top: 12px; width: 100%; font-size: 12px; background: none; border: none; color: #6b7280; cursor: pointer; text-decoration: underline;">Change API Key</button>
      </div>
    </div>
  </div>
`;

// 2. Inject into LeetCode
const container = document.createElement('div');
container.innerHTML = mentorHTML;
document.body.appendChild(container);

// 3. Grab Elements
const triggerBtn = document.getElementById('mentor-trigger');
const panel = document.getElementById('mentor-panel');
const closeBtn = document.getElementById('mentor-close');
const outputDiv = document.getElementById('mentor-output');
const setupDiv = document.getElementById('mentor-setup');
const toolsDiv = document.getElementById('mentor-tools');
const apiKeyInput = document.getElementById('mentor-api-key');
const saveKeyBtn = document.getElementById('mentor-save-key');
const ideaInput = document.getElementById('mentor-idea');
const submitIdeaBtn = document.getElementById('mentor-submit-idea');
const hintBtn = document.getElementById('mentor-hint-btn');
const reviewBtn = document.getElementById('mentor-review-btn');
const resetKeyBtn = document.getElementById('mentor-reset-key');

let groqApiKey = "";

// --- Sliding Window Memory ---
let sessionHistory = []; 
const MAX_MEMORY_TURNS = 4; 

// 4. Panel & Key Logic
triggerBtn.addEventListener('click', () => {
  panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
  checkApiKey();
});

closeBtn.addEventListener('click', () => { panel.style.display = 'none'; });

function checkApiKey() {
  chrome.storage.local.get(['groq_api_key'], (result) => {
    if (result.groq_api_key) {
      groqApiKey = result.groq_api_key;
      setupDiv.style.display = 'none';
      toolsDiv.style.display = 'block';
    } else {
      setupDiv.style.display = 'block';
      toolsDiv.style.display = 'none';
    }
  });
}

saveKeyBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (key) {
    chrome.storage.local.set({ groq_api_key: key }, () => {
      checkApiKey();
      outputDiv.innerHTML = "<strong>Key saved!</strong> Mentor is ready.";
    });
  }
});

resetKeyBtn.addEventListener('click', () => {
  chrome.storage.local.remove(['groq_api_key'], () => {
    groqApiKey = "";
    checkApiKey();
    outputDiv.innerHTML = "<strong>Key removed.</strong> Please enter a new Groq API key.";
  });
});

// UI Formatter
function formatResponse(text) {
  let html = text.replace(/\*\*(.*?)\*\*/g, '<strong style="display:block; margin-top:12px; color:#111827; font-size:14px;">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/\n/g, '<br>');
  return html;
}

// LeetCode Editor Scraper
function getEditorCode() {
  const codeLines = document.querySelectorAll('.view-line');
  let code = "";
  codeLines.forEach(line => code += line.textContent + "\n");
  return code.trim();
}

// 5. AI Core Logic with Streaming
async function askMentor(promptType) {
  const pageContent = document.body.innerText.substring(0, 2500); 
  const userIdea = ideaInput.value.trim();
  const userCode = getEditorCode();

  // Edge Case Validation
  if (promptType === "idea" && !userIdea) {
    outputDiv.innerHTML = "<strong style='color:#dc2626;'>Wait!</strong><br>Please type an approach or follow-up in the box.";
    return;
  }
  if (promptType === "review" && userCode.length < 10) {
    outputDiv.innerHTML = "<strong style='color:#dc2626;'>No Code Found!</strong><br>Write some code before asking for a review.";
    return;
  }

  outputDiv.innerHTML = "<em>Connecting to Mentor...</em>";
  
  // Base Instructions
  let systemPrompt = `You are a technical interviewer guiding a candidate. NEVER write code solutions. Keep responses extremely concise, structured, and straight to the point. No paragraphs.
  Problem context: ${pageContent}...`;

  // Determine current request
  let currentRequest = "";
  if (promptType === "hint") {
    currentRequest = `Provide a strict hint format:
    **Core Pattern:** [Name the algorithm]
    **Next Step:** [1 concise sentence on logic]
    **Edge Case:** [1 specific tricky input]`;
  } else if (promptType === "idea") {
    currentRequest = `The user says: "${userIdea}". 
    If this is a follow-up question, answer it concisely. If it is a new idea, reply strictly:
    **Verdict:** [Does it work? Yes/No and brief reason]
    **Complexity:** [What is the Time/Space cost?]`;
  } else if (promptType === "review") {
    currentRequest = `Here is the user's code: ${userCode}.
    Review their logic. Reply strictly:
    **Status:** [Acknowledge what works]
    **Bottleneck:** [Point out logic to optimize]
    **Goal:** [Optimal Time/Space needed]`;
  }

  let historyText = sessionHistory.map(turn => `${turn.role}: ${turn.text}`).join("\n");
  let finalPayload = `${systemPrompt}\n\n--- RECENT HISTORY ---\n${historyText}\n\n--- CURRENT REQUEST ---\n${currentRequest}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({ 
        model: "openai/gpt-oss-20b", 
        messages: [{ role: "user", content: finalPayload }],
        temperature: 0.2,
        stream: true // Enabled streaming output
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      outputDiv.innerHTML = `<strong>API Error:</strong> ${errorData.error ? errorData.error.message : 'Unknown error'}`;
      
      if (response.status === 401) {
        chrome.storage.local.remove(['groq_api_key'], () => {
          groqApiKey = "";
          setTimeout(checkApiKey, 2000);
        });
      }
      return;
    } 

    // Handle Streaming Response Chunks
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullResponseText = "";
    outputDiv.innerHTML = ""; // Clear loader text

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");
      
      for (const line of lines) {
        const cleanedLine = line.trim();
        if (!cleanedLine || cleanedLine === "data: [DONE]") continue;
        
        if (cleanedLine.startsWith("data: ")) {
          try {
            const jsonStr = cleanedLine.slice(6);
            const parsed = JSON.parse(jsonStr);
            const token = parsed.choices[0].delta.content || "";
            
            fullResponseText += token;
            outputDiv.innerHTML = formatResponse(fullResponseText);
            outputDiv.scrollTop = outputDiv.scrollHeight; // Auto-scroll down as text prints
          } catch (e) {
            // Keep going if a chunk boundary splits a JSON string
          }
        }
      }
    }
    
    // --- Update Sliding Window Memory ---
    let userActionText = userIdea ? userIdea : `[Requested ${promptType}]`;
    sessionHistory.push({ role: "Candidate", text: userActionText });
    sessionHistory.push({ role: "Mentor", text: fullResponseText });
    
    while (sessionHistory.length > MAX_MEMORY_TURNS) {
      sessionHistory.shift(); 
    }
    
    ideaInput.value = ""; 
    
  } catch (error) {
    outputDiv.innerHTML = "<strong>Network Error:</strong> Failed to connect to AI.";
  }
}

// 6. Action Listeners
submitIdeaBtn.addEventListener('click', () => askMentor('idea'));
hintBtn.addEventListener('click', () => askMentor('hint'));
reviewBtn.addEventListener('click', () => askMentor('review'));