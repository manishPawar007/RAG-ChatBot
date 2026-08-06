// ============================================================
// ResearchMind AI - Core Frontend Logic v3.0
// Fully connected multi-module single-page application
// ============================================================
"use strict";

/* ------------------------------------------------------------
   Global Application State
------------------------------------------------------------ */
const App = {
  els: {},
  state: {
    activeView: "chat",
    backendOnline: false,
    uploading: false,
    sending: false,
    documents: [],
    activeDocumentId: null,
    activeDocumentName: null,
    theme: "dark",
    sidebarOpen: false,
    drawerOpen: false,
    pendingDeleteId: null,
    sessions: [],
    currentSession: null,
    latestSummary: null
  }
};

/* ------------------------------------------------------------
   Storage Keys & Per-User Isolation Engine
------------------------------------------------------------ */
const ACCOUNTS_DB_KEY = "researchmind_accounts_db";

function getUserStorageKey(suffix = "sessions") {
  const email = App.state.user?.email || "guest";
  const safe = String(email).toLowerCase().trim().replace(/[^a-z0-9]/g, "_");
  return `researchmind_${suffix}_${safe}`;
}

/* ------------------------------------------------------------
   Session Management Helper Functions
------------------------------------------------------------ */
function generateId() {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function makeTitle(text) {
  const clean = String(text || "").trim().replace(/\s+/g, " ");
  if (!clean) return "New Conversation";
  return clean.length > 40 ? clean.slice(0, 40).trim() + "…" : clean;
}

function createSession() {
  return {
    id: generateId(),
    title: "New Conversation",
    messages: [],
    activeDocumentId: null,
    activeDocumentName: null,
    updatedAt: Date.now(),
    persisted: false
  };
}

function saveSessions() {
  try {
    const key = getUserStorageKey("sessions");
    localStorage.setItem(key, JSON.stringify(App.state.sessions));
  } catch (_) {}
}

function loadSessions() {
  try {
    const key = getUserStorageKey("sessions");
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
    return [];
  } catch (_) {
    return [];
  }
}

function saveCurrentPointer() {
  try {
    if (App.state.currentSession?.id) {
      const key = getUserStorageKey("current_session");
      localStorage.setItem(key, App.state.currentSession.id);
    }
  } catch (_) {}
}

function persistMessage(type, content, sources = []) {
  const session = App.state.currentSession;
  if (!session) return;

  if (!session.persisted) {
    session.persisted = true;
    App.state.sessions.unshift(session);
  }

  session.messages.push({ type, content, sources, timestamp: Date.now() });
  session.updatedAt = Date.now();

  if (session.title === "New Conversation" && type === "user") {
    session.title = makeTitle(content);
  }

  // Re-order sessions list so active floats to top
  App.state.sessions = App.state.sessions.filter((s) => s.id !== session.id);
  App.state.sessions.unshift(session);

  saveSessions();
  saveCurrentPointer();
  renderSessionList();
}

function startNewSession() {
  App.state.currentSession = createSession();
  App.state.activeDocumentId = null;
  App.state.activeDocumentName = null;
  updateActiveDocBanner();
  renderChatViewport();
  renderSessionList();
}

function switchToSession(id) {
  const session = App.state.sessions.find((s) => s.id === id);
  if (!session) return;

  App.state.currentSession = session;
  App.state.activeDocumentId = session.activeDocumentId || null;
  App.state.activeDocumentName = session.activeDocumentName || null;

  updateActiveDocBanner();
  renderChatViewport();
  saveCurrentPointer();
  renderSessionList();
}

function renameSession(id) {
  const session = App.state.sessions.find((s) => s.id === id);
  if (!session) return;

  const newTitle = prompt("Enter new title for this conversation:", session.title);
  if (newTitle !== null) {
    const clean = newTitle.trim();
    if (clean) {
      session.title = clean;
      saveSessions();
      renderSessionList();
      showToast("Conversation renamed", "success", 1500);
    }
  }
}

function deleteSession(id) {
  App.state.sessions = App.state.sessions.filter((s) => s.id !== id);
  saveSessions();

  if (App.state.currentSession?.id === id) {
    if (App.state.sessions.length > 0) {
      App.state.currentSession = App.state.sessions[0];
    } else {
      App.state.currentSession = createSession();
    }
    renderChatViewport();
  }

  renderSessionList();
  updateUserUI();
  showToast("Conversation deleted", "info", 1500);
}

function openExportModal() {
  const session = App.state.currentSession;
  if (!session || !session.messages || !session.messages.length) {
    showToast("No chat messages in this conversation to export.", "warning");
    return;
  }
  openModal(App.els.exportModal);
}

function exportAsPDF() {
  const session = App.state.currentSession;
  if (!session || !session.messages || !session.messages.length) return;

  closeModal(App.els.exportModal);

  let html = `<!DOCTYPE html>
<html>
<head>
  <title>ResearchMind AI - ${escapeHTML(session.title)}</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
    .header { border-bottom: 2px solid #3b82f6; padding-bottom: 15px; margin-bottom: 30px; }
    .header h1 { color: #0f172a; margin: 0 0 5px 0; font-size: 24px; }
    .header p { color: #64748b; margin: 0; font-size: 13px; }
    .msg { margin-bottom: 24px; padding: 16px; border-radius: 8px; }
    .user { background: #f1f5f9; border-left: 4px solid #6366f1; }
    .ai { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #3b82f6; }
    .sender { font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #334155; }
    .body { font-size: 14px; white-space: pre-wrap; }
    .sources { margin-top: 10px; padding-top: 8px; border-top: 1px solid #cbd5e1; font-size: 12px; color: #0284c7; }
    .footer { text-align: center; margin-top: 40px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔬 ResearchMind AI — Conversation Report</h1>
    <p><strong>Topic:</strong> ${escapeHTML(session.title)} | <strong>Exported:</strong> ${new Date().toLocaleString()}</p>
  </div>`;

  session.messages.forEach((m) => {
    const isUser = m.type === "user";
    const sender = isUser ? "👤 User Query" : "🔬 ResearchMind AI Response";
    let sourcesTxt = "";
    if (m.sources && m.sources.length) {
      sourcesTxt = `<div class="sources"><strong>Reference Sources:</strong> ${m.sources.map(s => escapeHTML(typeof s === "string" ? s : s.filename || "Chunk")).join(", ")}</div>`;
    }
    html += `
      <div class="msg ${isUser ? "user" : "ai"}">
        <div class="sender">${sender}</div>
        <div class="body">${escapeHTML(m.content)}</div>
        ${sourcesTxt}
      </div>`;
  });

  html += `
  <div class="footer">Generated by ResearchMind AI RAG Document Intelligence Studio</div>
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    showToast("Pop-up blocked. Please allow pop-ups to generate PDF.", "warning");
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();

  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
    showToast("PDF document print window ready", "success");
  }, 400);
}

function exportAsTXT() {
  const session = App.state.currentSession;
  if (!session || !session.messages || !session.messages.length) return;

  closeModal(App.els.exportModal);

  let txt = `====================================================\n`;
  txt += `RESEARCHMIND AI - CONVERSATION EXPORT\n`;
  txt += `Topic: ${session.title}\n`;
  txt += `Exported: ${new Date().toLocaleString()}\n`;
  txt += `====================================================\n\n`;

  session.messages.forEach((m) => {
    const sender = m.type === "user" ? "[USER]" : "[RESEARCHMIND AI]";
    txt += `${sender}\n${m.content}\n`;
    if (m.sources && m.sources.length) {
      txt += `Sources: ${m.sources.map((s) => typeof s === "string" ? s : s.filename || "Chunk").join(", ")}\n`;
    }
    txt += `\n----------------------------------------------------\n\n`;
  });

  downloadBlob(txt, `${session.title.replace(/[^a-z0-9]/gi, "_")}_Export.txt`, "text/plain;charset=utf-8;");
  showToast("Chat exported as Text (.txt) file", "success");
}

function exportAsMD() {
  const session = App.state.currentSession;
  if (!session || !session.messages || !session.messages.length) return;

  closeModal(App.els.exportModal);

  let md = `# ResearchMind AI - ${session.title}\n\n`;
  md += `*Exported Date*: ${new Date().toLocaleString()}\n\n---\n\n`;

  session.messages.forEach((m) => {
    const sender = m.type === "user" ? "### 👤 User" : "### 🔬 ResearchMind AI";
    md += `${sender}\n${m.content}\n\n`;
    if (m.sources && m.sources.length) {
      md += `*Sources*: ${m.sources.map((s) => typeof s === "string" ? s : s.filename || "Chunk").join(", ")}\n\n`;
    }
  });

  downloadBlob(md, `${session.title.replace(/[^a-z0-9]/gi, "_")}_Export.md`, "text/markdown;charset=utf-8;");
  showToast("Chat exported as Markdown (.md) file", "success");
}

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function speakText(text, btnEl) {
  if (!("speechSynthesis" in window)) {
    showToast("Text-to-speech is not supported in this browser.", "warning");
    return;
  }

  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    document.querySelectorAll(".btn-speak").forEach((b) => b.classList.remove("speaking"));
    if (btnEl && btnEl.classList.contains("speaking")) return;
  }

  const cleanText = text.replace(/<[^>]*>/g, "").replace(/[`*#]/g, "");
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = 1.0;

  if (btnEl) btnEl.classList.add("speaking");

  utterance.onend = () => {
    if (btnEl) btnEl.classList.remove("speaking");
  };
  utterance.onerror = () => {
    if (btnEl) btnEl.classList.remove("speaking");
  };

  window.speechSynthesis.speak(utterance);
}

let speechRecognitionInstance = null;

function toggleVoiceDictation() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast("Voice dictation is not supported in this browser.", "warning");
    return;
  }

  if (App.state.listening && speechRecognitionInstance) {
    speechRecognitionInstance.stop();
    App.state.listening = false;
    if (App.els.micButton) App.els.micButton.classList.remove("listening");
    showToast("Voice dictation stopped", "info", 1500);
    return;
  }

  try {
    speechRecognitionInstance = new SpeechRecognition();
    speechRecognitionInstance.continuous = false;
    speechRecognitionInstance.interimResults = false;
    speechRecognitionInstance.lang = "en-US";

    speechRecognitionInstance.onstart = () => {
      App.state.listening = true;
      if (App.els.micButton) App.els.micButton.classList.add("listening");
      showToast("Listening... speak your research question", "info", 2500);
    };

    speechRecognitionInstance.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      if (App.els.messageInput && transcript) {
        App.els.messageInput.value = (App.els.messageInput.value + " " + transcript).trim();
        autosizeInput();
      }
    };

    speechRecognitionInstance.onerror = () => {
      App.state.listening = false;
      if (App.els.micButton) App.els.micButton.classList.remove("listening");
    };

    speechRecognitionInstance.onend = () => {
      App.state.listening = false;
      if (App.els.micButton) App.els.micButton.classList.remove("listening");
    };

    speechRecognitionInstance.start();
  } catch (err) {
    showToast("Unable to start microphone dictation.", "warning");
  }
}

function clearAllHistory() {
  App.state.sessions = [];
  saveSessions();
  startNewSession();
  showToast("Chat history cleared", "info", 2000);
}

/* ------------------------------------------------------------
   API Service Layer
------------------------------------------------------------ */
const API = {
  async request(endpoint, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

    try {
      const res = await fetch(CONFIG.API_BASE_URL + endpoint, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timer);

      if (!res.ok) {
        let msg = `Request error (${res.status})`;
        try {
          const body = await res.json();
          msg = body.detail || body.message || msg;
        } catch (_) {}
        throw new Error(msg);
      }

      if (res.status === 204) return null;
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    } catch (err) {
      clearTimeout(timer);
      if (err.name === "AbortError") throw new Error("Request timed out. Please check your backend.");
      if (err instanceof TypeError) throw new Error("Cannot connect to backend API server.");
      throw err;
    }
  },

  health() {
    return API.request(CONFIG.ENDPOINTS.HEALTH);
  },

  getDocuments() {
    return API.request(CONFIG.ENDPOINTS.DOCUMENTS);
  },

  upload(file, onProgress) {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", CONFIG.API_BASE_URL + CONFIG.ENDPOINTS.UPLOAD);
      xhr.timeout = CONFIG.REQUEST_TIMEOUT;

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        let data = null;
        try { data = JSON.parse(xhr.responseText); } catch (_) {}
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data);
        } else {
          const msg = (data && (data.detail || data.message)) || `Upload failed (${xhr.status})`;
          reject(new Error(msg));
        }
      };

      xhr.onerror = () => reject(new Error("Cannot reach backend server. Ensure FastAPI is running."));
      xhr.ontimeout = () => reject(new Error("Upload timed out."));

      xhr.send(formData);
    });
  },

  chat(question, documentId) {
    return API.request(CONFIG.ENDPOINTS.CHAT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        document_id: documentId === null || documentId === undefined ? null : String(documentId)
      })
    });
  },

  deleteDocument(id) {
    return API.request(`${CONFIG.ENDPOINTS.DOCUMENTS}/${id}`, { method: "DELETE" });
  }
};

/* ------------------------------------------------------------
   UI Helper Tools & Formatting
------------------------------------------------------------ */
function escapeHTML(text = "") {
  const div = document.createElement("div");
  div.textContent = String(text);
  return div.innerHTML;
}

function formatMarkdown(text = "") {
  let html = escapeHTML(text);
  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`);
  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Bold & Italics
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  // Headings
  html = html.replace(/^### (.*)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.*)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.*)$/gm, "<h1>$1</h1>");
  // Newlines
  html = html.replace(/\n/g, "<br>");
  return html;
}

function formatBytes(bytes = 0) {
  if (!bytes) return "0 KB";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function showToast(message, type = "info", duration = 3000) {
  const container = App.els.toastContainer;
  if (!container) return;

  const icons = {
    success: "fa-circle-check",
    error: "fa-circle-exclamation",
    warning: "fa-triangle-exclamation",
    info: "fa-circle-info"
  };

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${escapeHTML(message)}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function showLoading(text = "Loading...") {
  if (App.els.loadingText) App.els.loadingText.textContent = text;
  if (App.els.loadingOverlay) App.els.loadingOverlay.classList.remove("hidden");
}

function hideLoading() {
  if (App.els.loadingOverlay) App.els.loadingOverlay.classList.add("hidden");
}

function openModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.remove("hidden");
}

function closeModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.add("hidden");
}

/* ------------------------------------------------------------
   View & Navigation Handling
------------------------------------------------------------ */
function switchView(viewName) {
  App.state.activeView = viewName;

  // Update navbar button states
  document.querySelectorAll(".nav-item").forEach((btn) => {
    const isTarget = btn.dataset.panel === viewName;
    btn.classList.toggle("active", isTarget);
  });

  // Update view panel visibility
  document.querySelectorAll(".view-panel").forEach((panel) => {
    const isTarget = panel.id === `view-${viewName}`;
    panel.classList.toggle("active", isTarget);
  });

  // Header Title Update
  const titles = {
    chat: { main: "AI Chat Studio", sub: "Ask questions across your research documents" },
    documents: { main: "Research Library", sub: "Manage and upload your reference papers" },
    analytics: { main: "Insights & Metrics", sub: "System health and vector database analytics" }
  };

  if (titles[viewName]) {
    App.els.viewTitle.textContent = titles[viewName].main;
    App.els.viewSubTitle.textContent = titles[viewName].sub;
  }

  if (viewName === "analytics") {
    renderAnalytics();
  }
}

/* ------------------------------------------------------------
   Chat Rendering Engine
------------------------------------------------------------ */
function scrollChatToBottom() {
  const container = App.els.chatMessages;
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

function renderChatViewport() {
  const container = App.els.chatMessages;
  const session = App.state.currentSession;
  container.innerHTML = "";

  if (!session || !session.messages.length) {
    if (App.els.welcomeScreen) {
      container.appendChild(App.els.welcomeScreen);
      App.els.welcomeScreen.classList.remove("hidden");
    }
    return;
  }

  if (App.els.welcomeScreen) App.els.welcomeScreen.classList.add("hidden");

  session.messages.forEach((msg) => {
    renderMessageBubble(msg.type, msg.content, msg.sources, false);
  });

  scrollChatToBottom();
}

function renderMessageBubble(type, content, sources = [], persist = true) {
  if (App.els.welcomeScreen && !App.els.welcomeScreen.classList.contains("hidden")) {
    App.els.welcomeScreen.classList.add("hidden");
  }

  const wrapper = document.createElement("div");
  const isUser = type === "user";
  wrapper.className = `message-wrapper ${isUser ? "user-message" : "ai-message"}`;

  let sourcesHTML = "";
  if (sources && sources.length) {
    const chips = sources.map((src) => `<span class="source-chip"><i class="fa-solid fa-quote-left"></i> ${escapeHTML(typeof src === "string" ? src : src.filename || "Chunk")}</span>`).join("");
    sourcesHTML = `
      <div class="sources-container">
        <div class="sources-title"><i class="fa-solid fa-bookmark"></i> Reference Sources</div>
        <div class="sources-chips">${chips}</div>
      </div>`;
  }

  let actionsHTML = "";
  if (!isUser) {
    actionsHTML = `
      <div class="message-actions">
        <button class="btn-speak" title="Listen to response"><i class="fa-solid fa-volume-high"></i> Listen</button>
        <button class="btn-copy" title="Copy response"><i class="fa-solid fa-copy"></i> Copy</button>
      </div>`;
  }

  wrapper.innerHTML = `
    <div class="message-avatar ${isUser ? "user-avatar" : "ai-avatar"}">
      <i class="fa-solid ${isUser ? "fa-user" : "fa-microscope"}"></i>
    </div>
    <div class="message-bubble">
      <div class="message-content">${isUser ? escapeHTML(content) : formatMarkdown(content)}</div>
      ${sourcesHTML}
      ${actionsHTML}
    </div>`;

  if (!isUser) {
    const copyBtn = wrapper.querySelector(".btn-copy");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(content);
        showToast("Copied to clipboard", "success", 1500);
      });
    }

    const speakBtn = wrapper.querySelector(".btn-speak");
    if (speakBtn) {
      speakBtn.addEventListener("click", () => {
        speakText(content, speakBtn);
      });
    }
  }

  App.els.chatMessages.appendChild(wrapper);
  scrollChatToBottom();

  if (persist) {
    persistMessage(type, content, sources);
  }
}

function showTypingIndicator() {
  if (App.els.typingIndicator) {
    App.els.typingIndicator.classList.remove("hidden");
    scrollChatToBottom();
  }
}

function hideTypingIndicator() {
  if (App.els.typingIndicator) {
    App.els.typingIndicator.classList.add("hidden");
  }
}

async function handleSendMessage(text) {
  if (App.state.sending) return;
  const message = (text || App.els.messageInput.value).trim();
  if (!message) return;

  App.state.sending = true;
  renderMessageBubble("user", message, [], true);
  App.els.messageInput.value = "";
  autosizeInput();
  showTypingIndicator();
  App.els.sendButton.disabled = true;

  try {
    const res = await API.chat(message, App.state.activeDocumentId);
    const answer = res?.answer || "No response generated from backend.";
    const sources = res?.sources || [];

    renderMessageBubble("ai", answer, sources, true);
  } catch (err) {
    renderMessageBubble("ai", `⚠️ Error: ${err.message || "Failed to process chat query."}`, [], true);
    showToast(err.message || "Failed to contact chat model", "error");
  } finally {
    hideTypingIndicator();
    App.els.sendButton.disabled = false;
    App.state.sending = false;
    App.els.messageInput.focus();
  }
}

function autosizeInput() {
  const input = App.els.messageInput;
  if (!input) return;
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 160) + "px";
}

/* ------------------------------------------------------------
   Research Library Engine & Per-User Document Isolation
------------------------------------------------------------ */
function getUserDocsKey() {
  const email = App.state.user?.email || "guest";
  const safe = String(email).toLowerCase().trim().replace(/[^a-z0-9]/g, "_");
  return `researchmind_docs_${safe}`;
}

function getUserDocIds() {
  try {
    const raw = localStorage.getItem(getUserDocsKey());
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function recordUserUploadedDoc(docId, filename = "") {
  try {
    const key = getUserDocsKey();
    const existing = getUserDocIds() || [];
    if (docId !== null && docId !== undefined && !existing.includes(String(docId))) {
      existing.push(String(docId));
    }
    if (filename && !existing.includes(String(filename))) {
      existing.push(String(filename));
    }
    localStorage.setItem(key, JSON.stringify(existing));
  } catch (e) {}
}

function removeUserDocId(docId, filename = "") {
  try {
    const key = getUserDocsKey();
    let existing = getUserDocIds() || [];
    const idStr = String(docId);
    existing = existing.filter((id) => id !== idStr && id !== String(filename));
    localStorage.setItem(key, JSON.stringify(existing));
  } catch (e) {}
}

async function loadDocuments(silent = false) {
  try {
    if (!silent) showLoading("Fetching documents...");
    const res = await API.getDocuments();
    const allDocs = Array.isArray(res) ? res : (res?.documents || []);

    // Filter documents per user account if user is logged in
    let filteredDocs = allDocs;
    if (App.state.user?.loggedIn && App.state.user?.email) {
      const userDocIds = getUserDocIds();
      if (userDocIds === null) {
        // Brand new user who hasn't uploaded anything yet -> 0 documents!
        filteredDocs = [];
      } else {
        filteredDocs = allDocs.filter(
          (d) => userDocIds.includes(String(d.id)) || userDocIds.includes(String(d.filename))
        );
      }
    }

    // Deduplicate documents by ID so 1 uploaded PDF renders exactly 1 card!
    const seenIds = new Set();
    const deduplicatedDocs = [];
    filteredDocs.forEach((d) => {
      const keyStr = String(d.id || d.filename);
      if (!seenIds.has(keyStr)) {
        seenIds.add(keyStr);
        deduplicatedDocs.push(d);
      }
    });

    App.state.documents = deduplicatedDocs;

    if (App.els.sidebarDocCount) {
      App.els.sidebarDocCount.textContent = App.state.documents.length;
    }

    renderDocumentsList(App.state.documents);
    renderDrawerDocsList(App.state.documents);
    populateTargetPdfDropdown();
    renderAnalytics();
    updateUserUI();
  } catch (err) {
    if (!silent) showToast(err.message || "Failed to load documents", "error");
  } finally {
    if (!silent) hideLoading();
  }
}

function renderDocumentsList(docs = []) {
  const container = App.els.documentsList;
  if (!container) return;

  container.innerHTML = "";

  if (!docs.length) {
    container.innerHTML = `
      <div class="empty-docs-state">
        <i class="fa-solid fa-folder-open"></i>
        <h3>Your Research Library is Empty</h3>
        <p>Upload PDFs to build your document vector store and start asking questions.</p>
        <button id="uploadFirstDocument" class="btn-primary">
          <i class="fa-solid fa-upload"></i> Upload First Document
        </button>
      </div>`;
    const btn = container.querySelector("#uploadFirstDocument");
    if (btn) btn.addEventListener("click", () => openModal(App.els.uploadModal));
    return;
  }

  docs.forEach((doc) => {
    const card = document.createElement("div");
    const isSelected = String(doc.id) === String(App.state.activeDocumentId);
    card.className = `document-card ${isSelected ? "active" : ""}`;

    card.innerHTML = `
      <div class="doc-card-top">
        <div class="doc-type-icon"><i class="fa-solid fa-file-pdf"></i></div>
        <div class="doc-meta-info">
          <h4 title="${escapeHTML(doc.filename)}">${escapeHTML(doc.filename)}</h4>
          <div class="doc-stats">
            <span>${formatBytes(doc.file_size)}</span>
            <span>• ${doc.total_pages || 1} pages</span>
            <span>• ${doc.total_chunks || 0} chunks</span>
          </div>
        </div>
      </div>
      <div class="doc-card-actions">
        <button class="btn-doc-select">${isSelected ? "<i class='fa-solid fa-check'></i> Focusing" : "Focus Chat"}</button>
        <button class="btn-doc-delete" title="Delete paper"><i class="fa-solid fa-trash"></i></button>
      </div>`;

    card.querySelector(".btn-doc-select").addEventListener("click", () => selectActiveDocument(doc));
    card.querySelector(".btn-doc-delete").addEventListener("click", (e) => {
      e.stopPropagation();
      requestDeleteDocument(doc.id);
    });

    container.appendChild(card);
  });
}

function renderDrawerDocsList(docs = []) {
  const container = App.els.drawerDocsList;
  if (!container) return;

  container.innerHTML = "";

  if (!docs.length) {
    container.innerHTML = `<div class="text-muted text-sm text-center py-4">No documents uploaded</div>`;
    return;
  }

  docs.forEach((doc) => {
    const item = document.createElement("div");
    const isSelected = String(doc.id) === String(App.state.activeDocumentId);
    item.className = `history-item ${isSelected ? "active" : ""}`;
    item.innerHTML = `
      <i class="fa-solid fa-file-pdf text-danger"></i>
      <span class="history-title">${escapeHTML(doc.filename)}</span>`;

    item.addEventListener("click", () => selectActiveDocument(doc));
    container.appendChild(item);
  });
}

function selectActiveDocument(doc) {
  if (App.state.activeDocumentId === doc.id || App.state.activeDocumentName === doc.filename || App.state.activeDocumentId === doc.filename) {
    App.state.activeDocumentId = null;
    App.state.activeDocumentName = null;
    showToast("Chat context reset to all documents", "info", 2000);
  } else {
    App.state.activeDocumentId = doc.filename || doc.id;
    App.state.activeDocumentName = doc.filename;
    showToast(`Chat focused on "${doc.filename}"`, "success", 2000);
  }

  updateActiveDocBanner();
  renderDocumentsList(App.state.documents);
  renderDrawerDocsList(App.state.documents);
}

function updateActiveDocBanner() {
  const banner = App.els.activeDocBanner;
  const nameEl = App.els.activeDocName;

  if (App.state.activeDocumentId && App.state.activeDocumentName) {
    nameEl.textContent = App.state.activeDocumentName;
    banner.classList.remove("hidden");
  } else {
    banner.classList.add("hidden");
  }

  populateTargetPdfDropdown();
}

function populateTargetPdfDropdown() {
  const select = App.els.targetPdfSelect;
  const badge = App.els.targetStatusBadge;
  if (!select) return;

  const docs = App.state.documents || [];
  const currentId = App.state.activeDocumentId ? String(App.state.activeDocumentId) : "";

  let optionsHTML = `<option value="">🌐 All Uploaded Documents (${docs.length} PDFs Context)</option>`;
  docs.forEach((doc) => {
    const docKey = doc.filename || doc.id;
    const selectedAttr = (String(doc.id) === currentId || String(doc.filename) === currentId) ? "selected" : "";
    optionsHTML += `<option value="${escapeHTML(docKey)}" ${selectedAttr}>📄 ${escapeHTML(doc.filename)}</option>`;
  });

  select.innerHTML = optionsHTML;
  select.value = currentId;

  if (badge) {
    if (App.state.activeDocumentId && App.state.activeDocumentName) {
      badge.textContent = `Targeting: ${App.state.activeDocumentName}`;
      badge.style.color = "var(--primary)";
      badge.style.borderColor = "var(--primary-glow)";
    } else {
      badge.textContent = docs.length ? `Querying All ${docs.length} PDFs` : "No PDFs Uploaded";
      badge.style.color = "var(--secondary)";
      badge.style.borderColor = "rgba(6, 182, 212, 0.25)";
    }
  }
}

function requestDeleteDocument(id) {
  App.state.pendingDeleteId = id;
  openModal(App.els.deleteModal);
}

async function confirmDeleteDocument() {
  const id = App.state.pendingDeleteId;
  if (!id) return;

  try {
    await API.deleteDocument(id);
    removeUserDocId(id);
    if (App.state.activeDocumentId === id) {
      App.state.activeDocumentId = null;
      App.state.activeDocumentName = null;
      updateActiveDocBanner();
    }
    showToast("Document removed from library", "success");
    closeModal(App.els.deleteModal);
    await loadDocuments(true);
  } catch (err) {
    showToast(err.message || "Failed to delete document", "error");
  } finally {
    App.state.pendingDeleteId = null;
  }
}

/* ------------------------------------------------------------
   File Upload Handling
------------------------------------------------------------ */
function setUploadProgress(percent, visible, fileName = "") {
  const card = App.els.uploadProgress;
  const fill = App.els.progressFill;
  const percentText = App.els.progressPercent;
  const textEl = App.els.progressText;

  if (card) card.classList.toggle("hidden", !visible);
  if (visible) {
    if (fill) fill.style.width = `${percent}%`;
    if (percentText) percentText.textContent = `${percent}%`;
    if (textEl) {
      if (percent <= 30) {
        textEl.textContent = `Uploading "${fileName}" (${percent}%)...`;
      } else if (percent <= 65) {
        textEl.textContent = `Parsing PDF pages & text chunking (${percent}%)...`;
      } else if (percent <= 92) {
        textEl.textContent = `Computing vector embeddings & ChromaDB indexing (${percent}%)...`;
      } else if (percent < 100) {
        textEl.textContent = `Generating summary & key takeaways (${percent}%)...`;
      } else {
        textEl.textContent = `Indexing completed for "${fileName}"! (100%)`;
      }
    }
  }
}

async function processFileUpload(file, isModal = false) {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    showToast("Only PDF documents are supported.", "warning");
    return;
  }
  if (file.size > CONFIG.MAX_FILE_SIZE) {
    showToast(`"${file.name}" exceeds max 50MB limit.`, "warning");
    return;
  }

  // Close upload modal if open
  if (isModal || (App.els.uploadModal && !App.els.uploadModal.classList.contains("hidden"))) {
    closeModal(App.els.uploadModal);
  }

  // Redirect view to Research Library immediately
  switchView("documents");

  App.state.uploading = true;
  let visualPercent = 5;
  setUploadProgress(visualPercent, true, file.name);

  // Smooth step-by-step progress ticker (10%..25%..50%..85%..92%)
  const progressTimer = setInterval(() => {
    if (visualPercent < 92) {
      const step = Math.floor(Math.random() * 8) + 4; // 4 to 11% step
      visualPercent = Math.min(visualPercent + step, 92);
      setUploadProgress(visualPercent, true, file.name);
    }
  }, 220);

  try {
    const res = await API.upload(file, (realPercent) => {
      visualPercent = Math.max(visualPercent, Math.floor(realPercent * 0.45));
      setUploadProgress(visualPercent, true, file.name);
    });

    // Clear simulation ticker & smoothly hit 100%
    clearInterval(progressTimer);
    visualPercent = 100;
    setUploadProgress(100, true, file.name);

    recordUserUploadedDoc(res?.document_id || res?.id || res?.doc_id, file.name);

    if (res?.summary) {
      App.state.latestSummary = {
        filename: file.name,
        summary: res.summary,
        key_points: res.key_points || []
      };
      renderLatestInsights();
    }

    // Wait 750ms so user clearly sees progress bar hit 100% before revealing PDF card in grid
    await new Promise((resolve) => setTimeout(resolve, 750));

    showToast(`"${file.name}" indexed & added to Research Library!`, "success", 4000);

    // Now reveal the new document card in the library
    await loadDocuments(true);
  } catch (err) {
    clearInterval(progressTimer);
    showToast(err.message || "Upload & indexing failed", "error");
  } finally {
    App.state.uploading = false;
    setTimeout(() => {
      setUploadProgress(0, false, file.name);
    }, 1500);
  }
}

/* ------------------------------------------------------------
   Analytics & Insights Dashboard
------------------------------------------------------------ */
function renderAnalytics() {
  const docs = App.state.documents || [];
  const totalDocs = docs.length;
  const totalPages = docs.reduce((acc, d) => acc + (d.total_pages || 1), 0);
  const totalChunks = docs.reduce((acc, d) => acc + (d.total_chunks || 0), 0);
  const totalBytes = docs.reduce((acc, d) => acc + (d.file_size || 0), 0);

  if (App.els.statTotalDocs) App.els.statTotalDocs.textContent = totalDocs;
  if (App.els.statTotalPages) App.els.statTotalPages.textContent = totalPages;
  if (App.els.statTotalChunks) App.els.statTotalChunks.textContent = totalChunks;
  if (App.els.statTotalSize) App.els.statTotalSize.textContent = formatBytes(totalBytes);

  renderLatestInsights();
}

function renderLatestInsights() {
  const container = App.els.insightsContent;
  if (!container) return;

  const docs = App.state.documents || [];

  if (!docs.length) {
    container.innerHTML = `
      <div class="empty-insights">
        <i class="fa-solid fa-book-bookmark"></i>
        <p>No documents found in your Research Library. Upload a PDF to view auto-generated summaries and vector stats.</p>
      </div>`;
    return;
  }

  // Render clickable document selector chips inside Summary Hub
  let chipsHTML = `<div class="insight-doc-selector"><span class="selector-tag"><i class="fa-solid fa-folder"></i> Select Paper:</span><div class="insight-doc-chips">`;

  docs.forEach((doc, idx) => {
    const isSelected = App.state.selectedInsightDocId
      ? String(doc.id) === String(App.state.selectedInsightDocId)
      : idx === 0;
    chipsHTML += `
      <button class="insight-chip ${isSelected ? "active" : ""}" data-id="${doc.id}">
        <i class="fa-solid fa-file-pdf"></i>
        <span>${escapeHTML(doc.filename)}</span>
      </button>`;
  });
  chipsHTML += `</div></div>`;

  // Determine which doc is selected
  const activeDocId = App.state.selectedInsightDocId || docs[0]?.id;
  const currentDoc = docs.find((d) => String(d.id) === String(activeDocId)) || docs[0];

  let bodyHTML = "";
  if (App.state.latestSummary && App.state.latestSummary.filename === currentDoc.filename) {
    const { summary, key_points } = App.state.latestSummary;
    const points = (key_points || []).map((pt) => `<li><i class="fa-solid fa-check text-primary"></i> ${escapeHTML(pt)}</li>`).join("");

    bodyHTML = `
      <div class="insight-details-card mt-3">
        <div class="insight-doc-header">
          <h4><i class="fa-solid fa-file-pdf text-danger"></i> ${escapeHTML(currentDoc.filename)}</h4>
          <span class="badge-status">${currentDoc.status || "Indexed"}</span>
        </div>
        <div class="insight-meta-row">
          <span><i class="fa-solid fa-hard-drive"></i> Size: ${formatBytes(currentDoc.file_size)}</span>
          <span><i class="fa-solid fa-file-lines"></i> Pages: ${currentDoc.total_pages || 1}</span>
          <span><i class="fa-solid fa-layer-group"></i> Vector Chunks: ${currentDoc.total_chunks || 0}</span>
          <span><i class="fa-solid fa-clock"></i> Uploaded: ${new Date(currentDoc.uploaded_at || Date.now()).toLocaleDateString()}</span>
        </div>
        <div class="summary-section mt-3">
          <h5 class="section-title"><i class="fa-solid fa-wand-magic-sparkles"></i> AI Executive Summary</h5>
          <div class="summary-body">${formatMarkdown(summary)}</div>
        </div>
        ${points ? `<div class="key-points-section mt-3"><h5 class="section-title"><i class="fa-solid fa-key"></i> Key Research Takeaways</h5><ul class="points-list">${points}</ul></div>` : ""}
      </div>`;
  } else {
    bodyHTML = `
      <div class="insight-details-card mt-3">
        <div class="insight-doc-header">
          <h4><i class="fa-solid fa-file-pdf text-danger"></i> ${escapeHTML(currentDoc.filename)}</h4>
          <button class="btn-primary btn-sm" id="insightFocusBtn"><i class="fa-solid fa-bullseye"></i> Focus Chat on This Paper</button>
        </div>
        <div class="insight-meta-row">
          <span><i class="fa-solid fa-hard-drive"></i> Size: ${formatBytes(currentDoc.file_size)}</span>
          <span><i class="fa-solid fa-file-lines"></i> Pages: ${currentDoc.total_pages || 1}</span>
          <span><i class="fa-solid fa-layer-group"></i> Vector Chunks: ${currentDoc.total_chunks || 0}</span>
          <span><i class="fa-solid fa-clock"></i> Uploaded: ${new Date(currentDoc.uploaded_at || Date.now()).toLocaleDateString()}</span>
        </div>
        <div class="summary-section mt-3">
          <p class="text-secondary text-sm">PDF parsed into <strong>${currentDoc.total_chunks || 0} vector chunks</strong>. Ask ResearchMind AI questions about this paper in the AI Chat Studio.</p>
        </div>
      </div>`;
  }

  container.innerHTML = chipsHTML + bodyHTML;

  // Bind chip click events
  container.querySelectorAll(".insight-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      App.state.selectedInsightDocId = chip.dataset.id;
      renderLatestInsights();
    });
  });

  const focusBtn = container.querySelector("#insightFocusBtn");
  if (focusBtn && currentDoc) {
    focusBtn.addEventListener("click", () => {
      selectActiveDocument(currentDoc);
      switchView("chat");
    });
  }
}

/* ------------------------------------------------------------
   Session Navigation Render
------------------------------------------------------------ */
function renderSessionList() {
  const container = App.els.chatHistoryList;
  if (!container) return;

  const sessions = App.state.sessions;
  const currentId = App.state.currentSession?.id;

  if (!sessions.length) {
    container.innerHTML = `<div class="chat-history-empty">No previous chats yet</div>`;
    return;
  }

  container.innerHTML = "";
  sessions.forEach((s) => {
    const item = document.createElement("div");
    const isSelected = s.id === currentId;
    item.className = `history-item ${isSelected ? "active" : ""}`;
    item.innerHTML = `
      <i class="fa-solid fa-message"></i>
      <span class="history-title" title="${escapeHTML(s.title)}">${escapeHTML(s.title)}</span>
      <button class="btn-history-rename" title="Rename chat"><i class="fa-solid fa-pen-to-square"></i></button>
      <button class="btn-history-delete" title="Delete chat"><i class="fa-solid fa-trash"></i></button>`;

    item.addEventListener("click", (e) => {
      if (e.target.closest(".btn-history-delete") || e.target.closest(".btn-history-rename")) return;
      switchToSession(s.id);
    });

    item.querySelector(".btn-history-rename").addEventListener("click", (e) => {
      e.stopPropagation();
      renameSession(s.id);
    });

    item.querySelector(".btn-history-delete").addEventListener("click", (e) => {
      e.stopPropagation();
      deleteSession(s.id);
    });

    container.appendChild(item);
  });
}

/* ------------------------------------------------------------
   Backend Health Poller
------------------------------------------------------------ */
async function checkBackendStatus() {
  try {
    await API.health();
    App.state.backendOnline = true;
  } catch (_) {
    App.state.backendOnline = false;
  }

  const online = App.state.backendOnline;
  if (App.els.backendStatus) App.els.backendStatus.textContent = online ? "Online & Ready" : "Offline";
  if (App.els.backendStatusBox) {
    App.els.backendStatusBox.classList.toggle("online", online);
    App.els.backendStatusBox.classList.toggle("offline", !online);
  }
  if (App.els.settingsBackendStatus) {
    App.els.settingsBackendStatus.textContent = online ? "Connected" : "Disconnected";
    App.els.settingsBackendStatus.className = `status-pill ${online ? "online" : ""}`;
  }
}

/* ------------------------------------------------------------
   Theme Switcher
------------------------------------------------------------ */
function toggleTheme() {
  App.state.theme = App.state.theme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", App.state.theme);
  localStorage.setItem(CONFIG.THEME_KEY, App.state.theme);
}

/* ------------------------------------------------------------
   DOM Cache & Event Wiring
------------------------------------------------------------ */
function cacheDOM() {
  const $ = (id) => document.getElementById(id);
  App.els = {
    viewTitle: $("viewTitle"),
    viewSubTitle: $("viewSubTitle"),
    activeDocBanner: $("activeDocBanner"),
    activeDocName: $("activeDocName"),
    clearActiveDoc: $("clearActiveDoc"),

    sidebar: $("sidebar"),
    sidebarToggle: $("sidebarToggle"),
    sidebarOverlay: $("sidebarOverlay"),
    newChatButton: $("newChatButton"),

    navChatBtn: $("navChatBtn"),
    navDocsBtn: $("navDocsBtn"),
    navAnalyticsBtn: $("navAnalyticsBtn"),

    chatHistoryList: $("chatHistoryList"),
    clearHistoryBtn: $("clearHistoryBtn"),

    backendStatus: $("backendStatus"),
    backendStatusBox: $("backendStatusBox"),

    chatMessages: $("chatMessages"),
    welcomeScreen: $("welcomeScreen"),
    typingIndicator: $("typingIndicator"),
    messageInput: $("messageInput"),
    sendButton: $("sendButton"),

    uploadButton: $("uploadButton"),
    micButton: $("micButton"),
    fileInput: $("fileInput"),

    documentsList: $("documentsList"),
    docSearchInput: $("docSearchInput"),
    refreshDocuments: $("refreshDocuments"),

    uploadProgress: $("uploadProgress"),
    progressFill: $("progressFill"),
    progressPercent: $("progressPercent"),

    statTotalDocs: $("statTotalDocs"),
    statTotalPages: $("statTotalPages"),
    statTotalChunks: $("statTotalChunks"),
    statTotalSize: $("statTotalSize"),
    insightsContent: $("insightsContent"),

    headerSearchInput: $("headerSearchInput"),
    clearHeaderSearch: $("clearHeaderSearch"),
    headerSearchResults: $("headerSearchResults"),

    exportChatBtn: $("exportChatBtn"),
    exportModal: $("exportModal"),
    closeExportModal: $("closeExportModal"),
    exportPdfBtn: $("exportPdfBtn"),
    exportTxtBtn: $("exportTxtBtn"),
    exportMdBtn: $("exportMdBtn"),

    targetPdfSelect: $("targetPdfSelect"),
    targetStatusBadge: $("targetStatusBadge"),

    documentsToggle: $("documentsToggle"),
    documentsPanel: $("documentsPanel"),
    closeDocumentsPanel: $("closeDocumentsPanel"),
    drawerDocsList: $("drawerDocsList"),
    drawerUploadBtn: $("drawerUploadBtn"),
    sidebarDocCount: $("sidebarDocCount"),

    themeToggle: $("themeToggle"),
    themeSwitch: $("themeSwitch"),
    settingsButton: $("settingsButton"),
    settingsModal: $("settingsModal"),
    closeSettingsModal: $("closeSettingsModal"),
    settingsBackendStatus: $("settingsBackendStatus"),

    addDocumentButton: $("addDocumentButton"),
    uploadModal: $("uploadModal"),
    closeUploadModal: $("closeUploadModal"),
    dropZone: $("dropZone"),
    browseFiles: $("browseFiles"),

    modalUploadProgress: $("modalUploadProgress"),
    modalProgressFill: $("modalProgressFill"),
    modalProgressPercent: $("modalProgressPercent"),

    userProfileBtn: $("userProfileBtn"),
    userMenuDropdown: $("userMenuDropdown"),
    userInitials: $("userInitials"),
    userName: $("userName"),
    userPlan: $("userPlan"),
    menuUserName: $("menuUserName"),
    menuUserEmail: $("menuUserEmail"),
    menuUserInitials: $("menuUserInitials"),
    menuUserPlan: $("menuUserPlan"),
    userStatChats: $("userStatChats"),
    userStatDocs: $("userStatDocs"),
    btnOpenLoginModal: $("btnOpenLoginModal"),
    btnLogout: $("btnLogout"),

    authModal: $("authModal"),
    closeAuthModal: $("closeAuthModal"),
    authAlertBox: $("authAlertBox"),
    authAlertText: $("authAlertText"),
    tabLoginBtn: $("tabLoginBtn"),
    tabRegisterBtn: $("tabRegisterBtn"),
    btnGuestLogin: $("btnGuestLogin"),
    loginForm: $("loginForm"),
    registerForm: $("registerForm"),
    loginEmail: $("loginEmail"),
    loginPassword: $("loginPassword"),
    regName: $("regName"),
    regEmail: $("regEmail"),
    regPassword: $("regPassword"),

    deleteModal: $("deleteModal"),
    closeDeleteModal: $("closeDeleteModal"),
    cancelDelete: $("cancelDelete"),
    confirmDelete: $("confirmDelete"),

    toastContainer: $("toastContainer"),
    loadingOverlay: $("loadingOverlay"),
    loadingText: $("loadingText")
  };
}

/* ------------------------------------------------------------
   Header Global Search Handling
------------------------------------------------------------ */
function handleHeaderSearch(query) {
  const container = App.els.headerSearchResults;
  const clearBtn = App.els.clearHeaderSearch;
  if (!container) return;

  const q = String(query || "").trim().toLowerCase();

  if (!q) {
    clearBtn.classList.add("hidden");
    container.classList.add("hidden");
    container.innerHTML = "";
    return;
  }

  clearBtn.classList.remove("hidden");
  container.classList.remove("hidden");

  // Search Documents
  const matchedDocs = (App.state.documents || []).filter((d) =>
    d.filename.toLowerCase().includes(q)
  );

  // Search Chat Sessions
  const matchedSessions = (App.state.sessions || []).filter((s) => {
    if (s.title.toLowerCase().includes(q)) return true;
    return s.messages && s.messages.some((m) => String(m.content).toLowerCase().includes(q));
  });

  if (!matchedDocs.length && !matchedSessions.length) {
    container.innerHTML = `
      <div class="search-no-results">
        <i class="fa-solid fa-magnifying-glass" style="margin-bottom:0.35rem; display:block; opacity:0.5;"></i>
        No matching documents or conversations found for "${escapeHTML(q)}"
      </div>`;
    return;
  }

  let html = "";

  if (matchedDocs.length) {
    html += `<div class="search-category-header"><i class="fa-solid fa-file-pdf"></i> Documents (${matchedDocs.length})</div>`;
    matchedDocs.forEach((doc) => {
      html += `
        <div class="search-result-item" data-type="doc" data-id="${doc.id}">
          <i class="fa-solid fa-file-pdf text-danger"></i>
          <div class="search-result-info">
            <div class="search-result-title">${escapeHTML(doc.filename)}</div>
            <div class="search-result-sub">${formatBytes(doc.file_size)} • ${doc.total_pages || 1} pages</div>
          </div>
        </div>`;
    });
  }

  if (matchedSessions.length) {
    html += `<div class="search-category-header"><i class="fa-solid fa-comments"></i> Conversations (${matchedSessions.length})</div>`;
    matchedSessions.forEach((session) => {
      html += `
        <div class="search-result-item" data-type="session" data-id="${session.id}">
          <i class="fa-solid fa-message text-primary"></i>
          <div class="search-result-info">
            <div class="search-result-title">${escapeHTML(session.title)}</div>
            <div class="search-result-sub">${session.messages ? session.messages.length : 0} messages</div>
          </div>
        </div>`;
    });
  }

  container.innerHTML = html;

  // Click listeners on search results
  container.querySelectorAll(".search-result-item").forEach((item) => {
    item.addEventListener("click", () => {
      const type = item.dataset.type;
      const id = item.dataset.id;

      if (type === "doc") {
        const doc = App.state.documents.find((d) => String(d.id) === String(id));
        if (doc) selectActiveDocument(doc);
        switchView("documents");
      } else if (type === "session") {
        switchToSession(id);
        switchView("chat");
      }

      container.classList.add("hidden");
      clearBtn.classList.add("hidden");
      App.els.headerSearchInput.value = "";
    });
  });
}

function registerEvents() {
  const el = App.els;

  // Header Global Working Search Bar
  if (el.headerSearchInput) {
    el.headerSearchInput.addEventListener("input", (e) => {
      handleHeaderSearch(e.target.value);
    });
  }

  if (el.clearHeaderSearch) {
    el.clearHeaderSearch.addEventListener("click", () => {
      el.headerSearchInput.value = "";
      handleHeaderSearch("");
    });
  }

  // Close search dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (el.headerSearchResults && !e.target.closest(".header-search-container")) {
      el.headerSearchResults.classList.add("hidden");
    }
  });

  // Export Chat Options Modal
  if (el.exportChatBtn) {
    el.exportChatBtn.addEventListener("click", openExportModal);
  }
  if (el.closeExportModal) {
    el.closeExportModal.addEventListener("click", () => closeModal(el.exportModal));
  }
  if (el.exportPdfBtn) {
    el.exportPdfBtn.addEventListener("click", exportAsPDF);
  }
  if (el.exportTxtBtn) {
    el.exportTxtBtn.addEventListener("click", exportAsTXT);
  }
  if (el.exportMdBtn) {
    el.exportMdBtn.addEventListener("click", exportAsMD);
  }

  // Voice Dictation Mic
  if (el.micButton) {
    el.micButton.addEventListener("click", toggleVoiceDictation);
  }

  // Target PDF Selector Dropdown
  if (el.targetPdfSelect) {
    el.targetPdfSelect.addEventListener("change", (e) => {
      const val = e.target.value;
      if (!val) {
        App.state.activeDocumentId = null;
        App.state.activeDocumentName = null;
        showToast("Chat context reset to all documents", "info", 1500);
      } else {
        const doc = App.state.documents.find(
          (d) => String(d.id) === String(val) || String(d.filename) === String(val)
        );
        if (doc) {
          App.state.activeDocumentId = doc.filename || doc.id;
          App.state.activeDocumentName = doc.filename;
          showToast(`Targeted chat on "${doc.filename}"`, "success", 1500);
        } else {
          App.state.activeDocumentId = val;
          App.state.activeDocumentName = val;
          showToast(`Targeted chat on "${val}"`, "success", 1500);
        }
      }
      updateActiveDocBanner();
      renderDocumentsList(App.state.documents);
      renderDrawerDocsList(App.state.documents);
    });
  }

  // View Navigation
  el.navChatBtn.addEventListener("click", () => switchView("chat"));
  el.navDocsBtn.addEventListener("click", () => switchView("documents"));
  el.navAnalyticsBtn.addEventListener("click", () => switchView("analytics"));

  // Mobile sidebar
  el.sidebarToggle.addEventListener("click", () => {
    el.sidebar.classList.toggle("open");
    el.sidebarOverlay.classList.toggle("active");
  });
  el.sidebarOverlay.addEventListener("click", () => {
    el.sidebar.classList.remove("open");
    el.sidebarOverlay.classList.remove("active");
  });

  // Slide-over drawer
  el.documentsToggle.addEventListener("click", () => el.documentsPanel.classList.toggle("open"));
  el.closeDocumentsPanel.addEventListener("click", () => el.documentsPanel.classList.remove("open"));

  // New Chat & Clear History
  el.newChatButton.addEventListener("click", startNewSession);
  el.clearHistoryBtn.addEventListener("click", clearAllHistory);

  // Active Doc Reset
  el.clearActiveDoc.addEventListener("click", () => {
    App.state.activeDocumentId = null;
    App.state.activeDocumentName = null;
    updateActiveDocBanner();
    renderDocumentsList(App.state.documents);
    renderDrawerDocsList(App.state.documents);
    showToast("Filter reset to all documents", "info", 1500);
  });

  // Chat Actions
  el.sendButton.addEventListener("click", () => handleSendMessage());
  el.messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });
  el.messageInput.addEventListener("input", autosizeInput);

  document.querySelectorAll(".suggestion-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const text = chip.querySelector("span")?.textContent || chip.textContent.trim();
      handleSendMessage(text);
    });
  });

  // Upload Actions
  el.uploadButton.addEventListener("click", () => el.fileInput.click());
  el.drawerUploadBtn.addEventListener("click", () => openModal(el.uploadModal));
  el.addDocumentButton.addEventListener("click", () => openModal(el.uploadModal));
  el.closeUploadModal.addEventListener("click", () => closeModal(el.uploadModal));

  el.fileInput.addEventListener("change", (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) processFileUpload(files[0], false);
    e.target.value = "";
  });

  el.browseFiles.addEventListener("click", () => el.fileInput.click());

  // Drag & drop
  ["dragover", "dragenter"].forEach((evt) => {
    el.dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      el.dropZone.classList.add("drag-over");
    });
  });
  ["dragleave", "dragend"].forEach((evt) => {
    el.dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      el.dropZone.classList.remove("drag-over");
    });
  });
  el.dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    el.dropZone.classList.remove("drag-over");
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) processFileUpload(files[0], true);
  });

  // Document Filtering
  el.docSearchInput.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase().trim();
    const filtered = App.state.documents.filter((d) => d.filename.toLowerCase().includes(term));
    renderDocumentsList(filtered);
  });

  el.refreshDocuments.addEventListener("click", async () => {
    await loadDocuments();
    showToast("Library refreshed", "success", 1500);
  });

  // Delete Modal Actions
  el.closeDeleteModal.addEventListener("click", () => closeModal(el.deleteModal));
  el.cancelDelete.addEventListener("click", () => closeModal(el.deleteModal));
  el.confirmDelete.addEventListener("click", confirmDeleteDocument);

  // ChatGPT User Profile & Auth Modal
  if (el.userProfileBtn) {
    el.userProfileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      updateUserUI();
      if (el.userMenuDropdown) el.userMenuDropdown.classList.toggle("hidden");
    });
  }

  document.addEventListener("click", (e) => {
    if (el.userMenuDropdown && !e.target.closest("#userProfileWrapper")) {
      el.userMenuDropdown.classList.add("hidden");
    }
  });

  if (el.btnOpenLoginModal) {
    el.btnOpenLoginModal.addEventListener("click", () => openModal(el.authModal));
  }
  if (el.closeAuthModal) {
    el.closeAuthModal.addEventListener("click", () => closeModal(el.authModal));
  }
  if (el.tabLoginBtn) {
    el.tabLoginBtn.addEventListener("click", () => switchAuthTab("login"));
  }
  if (el.tabRegisterBtn) {
    el.tabRegisterBtn.addEventListener("click", () => switchAuthTab("register"));
  }
  if (el.btnGuestLogin) {
    el.btnGuestLogin.addEventListener("click", (e) => {
      e.preventDefault();
      handleGuestDemoLogin();
    });
  }
  if (el.loginForm) {
    el.loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = el.loginEmail ? el.loginEmail.value : "";
      const pass = el.loginPassword ? el.loginPassword.value : "";
      handleLoginSubmit(email, pass);
    });
  }
  if (el.registerForm) {
    el.registerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = el.regName ? el.regName.value : "";
      const email = el.regEmail ? el.regEmail.value : "";
      const pass = el.regPassword ? el.regPassword.value : "";
      handleRegisterSubmit(name, email, pass);
    });
  }
  if (el.btnLogout) {
    el.btnLogout.addEventListener("click", handleLogout);
  }

  // Settings Modal Actions
  el.settingsButton.addEventListener("click", () => openModal(el.settingsModal));
  el.closeSettingsModal.addEventListener("click", () => closeModal(el.settingsModal));
  el.themeToggle.addEventListener("click", toggleTheme);
  el.themeSwitch.addEventListener("click", toggleTheme);

  // Close modals on background click
  document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        if (backdrop === el.authModal && !App.state.user.loggedIn) return;
        closeModal(backdrop);
      }
    });
  });

  // Esc key closes open modals
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal-backdrop:not(.hidden)").forEach((backdrop) => {
        if (backdrop === el.authModal && !App.state.user.loggedIn) return;
        closeModal(backdrop);
      });
    }
  });
}

/* ------------------------------------------------------------
   ChatGPT-Style Multi-User Auth & Isolated History Engine
------------------------------------------------------------ */
function getRegisteredAccounts() {
  try {
    const raw = localStorage.getItem(ACCOUNTS_DB_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveRegisteredAccounts(accounts) {
  try {
    localStorage.setItem(ACCOUNTS_DB_KEY, JSON.stringify(accounts));
  } catch (_) {}
}

function initUserAuth() {
  const saved = localStorage.getItem("researchmind_user_v1");
  if (saved) {
    try {
      App.state.user = JSON.parse(saved);
    } catch (e) {
      App.state.user = defaultUser();
    }
  } else {
    App.state.user = defaultUser();
  }
  updateUserUI();

  // If unauthenticated, automatically pop open Login page
  if (!App.state.user.loggedIn && App.els.authModal) {
    setTimeout(() => {
      openModal(App.els.authModal);
    }, 350);
  }
}

function defaultUser() {
  return {
    loggedIn: false,
    name: "Guest Researcher",
    email: "guest@researchmind.ai",
    plan: "Free Account",
    initials: "GU"
  };
}

function getInitials(name) {
  if (!name) return "GU";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function updateUserUI() {
  const u = App.state.user || defaultUser();
  const el = App.els;
  const initials = u.initials || getInitials(u.name);

  if (el.userName) el.userName.textContent = u.name;
  if (el.userPlan) el.userPlan.textContent = u.plan;
  if (el.userInitials) el.userInitials.textContent = initials;
  if (el.menuUserName) el.menuUserName.textContent = u.name;
  if (el.menuUserEmail) el.menuUserEmail.textContent = u.email;
  if (el.menuUserPlan) el.menuUserPlan.textContent = u.plan;
  if (el.menuUserInitials) el.menuUserInitials.textContent = initials;

  if (el.userStatChats) el.userStatChats.textContent = (App.state.sessions || []).length;
  if (el.userStatDocs) el.userStatDocs.textContent = (App.state.documents || []).length;

  if (el.btnLogout) el.btnLogout.classList.toggle("hidden", !u.loggedIn);
  if (el.btnOpenLoginModal) el.btnOpenLoginModal.classList.toggle("hidden", u.loggedIn);
  if (el.closeAuthModal) el.closeAuthModal.classList.toggle("hidden", !u.loggedIn);
}

async function switchUserContext(userEmail) {
  // Reset targeted document focus pointers on account switch
  App.state.activeDocumentId = null;
  App.state.activeDocumentName = null;

  updateUserUI();

  // Load documents for THIS user FIRST before populating dropdown
  await loadDocuments(true);

  // Load user-isolated sessions
  App.state.sessions = loadSessions();

  let activePointer = null;
  try {
    activePointer = localStorage.getItem(getUserStorageKey("current_session"));
  } catch (_) {}

  const restored = activePointer ? App.state.sessions.find((s) => s.id === activePointer) : null;
  if (restored) {
    App.state.currentSession = restored;
    App.state.activeDocumentId = restored.activeDocumentId || null;
    App.state.activeDocumentName = restored.activeDocumentName || null;
  } else if (App.state.sessions.length > 0) {
    App.state.currentSession = App.state.sessions[0];
    App.state.activeDocumentId = App.state.currentSession.activeDocumentId || null;
    App.state.activeDocumentName = App.state.currentSession.activeDocumentName || null;
  } else {
    App.state.currentSession = createSession();
  }

  updateActiveDocBanner();
  renderSessionList();
  renderChatViewport();
}

function handleLoginSubmit(email, password) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    showToast("Please enter a valid email or username.", "warning");
    return;
  }

  const accounts = getRegisteredAccounts();
  const account = accounts.find((a) => a.email.toLowerCase() === normalizedEmail);

  if (!account) {
    const msg = `User is not registered. Please create an account first.`;
    if (App.els.authAlertBox && App.els.authAlertText) {
      App.els.authAlertText.textContent = msg;
      App.els.authAlertBox.classList.remove("hidden");
    }
    showToast(msg, "warning", 5000);
    switchAuthTab("register");
    if (App.els.regEmail) App.els.regEmail.value = normalizedEmail;
    if (App.els.regPassword && password) App.els.regPassword.value = password;
    return;
  }

  const user = {
    loggedIn: true,
    name: account.name,
    email: account.email,
    plan: account.plan || "Pro Researcher",
    initials: getInitials(account.name)
  };

  App.state.user = user;
  localStorage.setItem("researchmind_user_v1", JSON.stringify(user));
  switchUserContext(account.email);

  if (App.els.authModal) closeModal(App.els.authModal);
  if (App.els.userMenuDropdown) App.els.userMenuDropdown.classList.add("hidden");
  showToast(`Welcome back, ${user.name}!`, "success", 3000);
}

function handleRegisterSubmit(name, email, password) {
  const cleanName = String(name || "").trim();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const pass = String(password || "").trim();

  if (!cleanName || !normalizedEmail) {
    showToast("Please fill in all required registration fields.", "warning");
    return;
  }

  const accounts = getRegisteredAccounts();
  const existing = accounts.find((a) => a.email.toLowerCase() === normalizedEmail);

  if (existing) {
    showToast(`"${email}" is already registered! Please Sign In instead.`, "info", 4000);
    switchAuthTab("login");
    if (App.els.loginEmail) App.els.loginEmail.value = normalizedEmail;
    return;
  }

  const newAccount = {
    name: cleanName,
    email: normalizedEmail,
    password: pass,
    plan: "Pro Researcher",
    createdAt: Date.now()
  };

  accounts.push(newAccount);
  saveRegisteredAccounts(accounts);

  const user = {
    loggedIn: true,
    name: cleanName,
    email: normalizedEmail,
    plan: "Pro Researcher",
    initials: getInitials(cleanName)
  };

  App.state.user = user;
  localStorage.setItem("researchmind_user_v1", JSON.stringify(user));
  switchUserContext(normalizedEmail);

  if (App.els.authAlertBox) App.els.authAlertBox.classList.add("hidden");
  if (App.els.authModal) closeModal(App.els.authModal);
  if (App.els.userMenuDropdown) App.els.userMenuDropdown.classList.add("hidden");
  showToast(`🎉 Account created successfully! Welcome, ${cleanName}.`, "success", 4000);
}

function handleGuestDemoLogin() {
  const demoEmail = "demo@researchmind.ai";
  const demoName = "Demo Researcher";

  const accounts = getRegisteredAccounts();
  let account = accounts.find((a) => a.email === demoEmail);
  if (!account) {
    account = { name: demoName, email: demoEmail, password: "demo", plan: "Demo Pro Account", createdAt: Date.now() };
    accounts.push(account);
    saveRegisteredAccounts(accounts);
  }

  handleLoginSubmit(demoEmail, "demo");
}

function handleLogout() {
  App.state.user = defaultUser();
  localStorage.removeItem("researchmind_user_v1");

  // Reset active document focus & documents list
  App.state.activeDocumentId = null;
  App.state.activeDocumentName = null;
  App.state.sessions = [];
  App.state.currentSession = null;
  App.state.documents = [];

  updateUserUI();
  renderSessionList();
  renderChatViewport();
  updateActiveDocBanner();
  populateTargetPdfDropdown();
  renderDocumentsList([]);

  if (App.els.userMenuDropdown) App.els.userMenuDropdown.classList.add("hidden");
  showToast("Signed out successfully.", "info", 2000);

  // Re-open login modal immediately on logout
  if (App.els.authModal) {
    setTimeout(() => {
      openModal(App.els.authModal);
    }, 300);
  }
}

function switchAuthTab(tab) {
  const isLogin = tab === "login";
  if (App.els.tabLoginBtn) App.els.tabLoginBtn.classList.toggle("active", isLogin);
  if (App.els.tabRegisterBtn) App.els.tabRegisterBtn.classList.toggle("active", !isLogin);
  if (App.els.loginForm) App.els.loginForm.classList.toggle("hidden", !isLogin);
  if (App.els.registerForm) App.els.registerForm.classList.toggle("hidden", isLogin);
}

/* ------------------------------------------------------------
   Application Bootstrap
------------------------------------------------------------ */
async function startApplication() {
  cacheDOM();
  registerEvents();
  initUserAuth();

  // Restore Theme
  const savedTheme = localStorage.getItem(CONFIG.THEME_KEY) || "dark";
  App.state.theme = savedTheme;
  document.documentElement.setAttribute("data-theme", savedTheme);

  // Load User-Isolated Sessions
  if (App.state.user?.loggedIn && App.state.user?.email) {
    switchUserContext(App.state.user.email);
  } else {
    App.state.sessions = [];
    App.state.currentSession = null;
    renderSessionList();
    renderChatViewport();
  }

  // Initial network sync
  showLoading("Connecting to ResearchMind AI Backend...");
  await checkBackendStatus();
  if (App.state.backendOnline) {
    await loadDocuments(true);
  } else {
    showToast("Backend offline. Start FastAPI server at http://127.0.0.1:8000", "warning", 5000);
  }
  hideLoading();

  // Periodic Health Polling
  setInterval(checkBackendStatus, CONFIG.HEALTH_POLL_MS);
}

document.addEventListener("DOMContentLoaded", startApplication);