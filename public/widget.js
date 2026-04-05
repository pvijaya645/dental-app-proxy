(function () {
  "use strict";

  // ── Config ────────────────────────────────────────────────
  const script = document.currentScript;
  const API_KEY = script?.getAttribute("data-key") || "";
  const API_URL = script?.getAttribute("data-api") || "http://localhost:8000";
  const OFFICE_NAME = script?.getAttribute("data-name") || "Our Dental Office";
  const THEME_COLOR = script?.getAttribute("data-color") || "#2563eb";

  // ── Session ───────────────────────────────────────────────
  let sessionId = localStorage.getItem("ravira_session_" + API_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem("ravira_session_" + API_KEY, sessionId);
  }

  // ── Styles ────────────────────────────────────────────────
  const styles = `
    #ravira-widget * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

    #ravira-bubble {
      position: fixed; bottom: 24px; right: 24px; z-index: 9999;
      width: 60px; height: 60px; border-radius: 50%;
      background: ${THEME_COLOR}; color: white;
      border: none; cursor: pointer;
      box-shadow: 0 4px 16px rgba(0,0,0,0.25);
      display: flex; align-items: center; justify-content: center;
      font-size: 26px; transition: transform 0.2s, box-shadow 0.2s;
    }
    #ravira-bubble:hover { transform: scale(1.08); box-shadow: 0 6px 20px rgba(0,0,0,0.3); }

    #ravira-window {
      position: fixed; bottom: 96px; right: 24px; z-index: 9998;
      width: 360px; height: 520px; border-radius: 16px;
      background: #fff; box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      display: none; flex-direction: column; overflow: hidden;
      animation: ravira-slide-up 0.25s ease;
    }
    @keyframes ravira-slide-up {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    #ravira-window.open { display: flex; }

    #ravira-header {
      background: ${THEME_COLOR}; color: white;
      padding: 16px 20px; display: flex; align-items: center; gap: 12px;
    }
    #ravira-header .avatar {
      width: 38px; height: 38px; border-radius: 50%;
      background: rgba(255,255,255,0.25);
      display: flex; align-items: center; justify-content: center; font-size: 18px;
    }
    #ravira-header .info { flex: 1; }
    #ravira-header .info h3 { margin: 0; font-size: 15px; font-weight: 600; }
    #ravira-header .info span { font-size: 12px; opacity: 0.85; }
    #ravira-close {
      background: none; border: none; color: white;
      font-size: 20px; cursor: pointer; opacity: 0.8; padding: 4px;
    }
    #ravira-close:hover { opacity: 1; }

    #ravira-messages {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 10px;
      background: #f8fafc;
    }
    #ravira-messages::-webkit-scrollbar { width: 4px; }
    #ravira-messages::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

    .ravira-msg {
      max-width: 82%; padding: 10px 14px;
      border-radius: 14px; font-size: 14px; line-height: 1.5;
      animation: ravira-fade-in 0.2s ease;
    }
    @keyframes ravira-fade-in { from { opacity: 0; } to { opacity: 1; } }

    .ravira-msg.bot {
      background: #fff; color: #1e293b;
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      align-self: flex-start;
    }
    .ravira-msg.user {
      background: ${THEME_COLOR}; color: white;
      border-bottom-right-radius: 4px;
      align-self: flex-end;
    }
    .ravira-msg.typing {
      background: #fff; align-self: flex-start;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .ravira-dots span {
      display: inline-block; width: 7px; height: 7px;
      background: #94a3b8; border-radius: 50%; margin: 0 2px;
      animation: ravira-bounce 1.2s infinite;
    }
    .ravira-dots span:nth-child(2) { animation-delay: 0.2s; }
    .ravira-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes ravira-bounce {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-6px); }
    }

    #ravira-input-area {
      padding: 12px 16px; background: #fff;
      border-top: 1px solid #e2e8f0;
      display: flex; gap: 8px; align-items: center;
    }
    #ravira-input {
      flex: 1; border: 1px solid #e2e8f0; border-radius: 24px;
      padding: 10px 16px; font-size: 14px; outline: none;
      resize: none; background: #f8fafc; transition: border-color 0.2s;
    }
    #ravira-input:focus { border-color: ${THEME_COLOR}; background: #fff; }
    #ravira-send {
      width: 40px; height: 40px; border-radius: 50%; border: none;
      background: ${THEME_COLOR}; color: white; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; transition: opacity 0.2s; flex-shrink: 0;
    }
    #ravira-send:hover { opacity: 0.85; }
    #ravira-send:disabled { opacity: 0.4; cursor: not-allowed; }

    #ravira-footer {
      text-align: center; font-size: 11px; color: #94a3b8;
      padding: 6px; background: #fff; border-top: 1px solid #f1f5f9;
    }

    @media (max-width: 420px) {
      #ravira-window { width: calc(100vw - 16px); right: 8px; bottom: 88px; }
    }
  `;

  // ── DOM ───────────────────────────────────────────────────
  const styleEl = document.createElement("style");
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);

  const widget = document.createElement("div");
  widget.id = "ravira-widget";
  widget.innerHTML = `
    <button id="ravira-bubble" aria-label="Open chat">💬</button>
    <div id="ravira-window" role="dialog" aria-label="Chat with ${OFFICE_NAME}">
      <div id="ravira-header">
        <div class="avatar">🦷</div>
        <div class="info">
          <h3>${OFFICE_NAME}</h3>
          <span>AI Receptionist • Usually replies instantly</span>
        </div>
        <button id="ravira-close" aria-label="Close">✕</button>
      </div>
      <div id="ravira-messages"></div>
      <div id="ravira-input-area">
        <input id="ravira-input" type="text" placeholder="Ask a question…" autocomplete="off" />
        <button id="ravira-send" aria-label="Send">➤</button>
      </div>
      <div id="ravira-footer">Powered by Ravira AI</div>
    </div>
  `;
  document.body.appendChild(widget);

  // ── Elements ──────────────────────────────────────────────
  const bubble   = document.getElementById("ravira-bubble");
  const window_  = document.getElementById("ravira-window");
  const messages = document.getElementById("ravira-messages");
  const input    = document.getElementById("ravira-input");
  const sendBtn  = document.getElementById("ravira-send");
  const closeBtn = document.getElementById("ravira-close");

  let isOpen = false;
  let isWaiting = false;
  let greeted = false;

  // ── Helpers ───────────────────────────────────────────────
  function addMessage(text, role) {
    const el = document.createElement("div");
    el.className = `ravira-msg ${role}`;
    el.textContent = text;
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
    return el;
  }

  function showTyping() {
    const el = document.createElement("div");
    el.className = "ravira-msg typing";
    el.id = "ravira-typing";
    el.innerHTML = `<div class="ravira-dots"><span></span><span></span><span></span></div>`;
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
  }

  function hideTyping() {
    const el = document.getElementById("ravira-typing");
    if (el) el.remove();
  }

  function setWaiting(val) {
    isWaiting = val;
    sendBtn.disabled = val;
    input.disabled = val;
  }

  // ── Open / Close ──────────────────────────────────────────
  function openChat() {
    isOpen = true;
    window_.classList.add("open");
    bubble.innerHTML = "✕";
    input.focus();
    if (!greeted) {
      greeted = true;
      setTimeout(() => {
        addMessage(
          `Hi! 👋 Welcome to ${OFFICE_NAME}. I'm your AI receptionist — I can answer questions about our hours, services, insurance, and more. How can I help you today?`,
          "bot"
        );
      }, 300);
    }
  }

  function closeChat() {
    isOpen = false;
    window_.classList.remove("open");
    bubble.innerHTML = "💬";
  }

  bubble.addEventListener("click", () => (isOpen ? closeChat() : openChat()));
  closeBtn.addEventListener("click", closeChat);

  // ── Send message ──────────────────────────────────────────
  async function sendMessage() {
    const text = input.value.trim();
    if (!text || isWaiting) return;

    input.value = "";
    addMessage(text, "user");
    setWaiting(true);
    showTyping();

    try {
      const res = await fetch(`${API_URL}/api/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          widget_api_key: API_KEY,
          session_id: sessionId,
          message: text,
          channel: "chat",
        }),
      });

      const data = await res.json();
      hideTyping();

      if (res.ok) {
        addMessage(data.response, "bot");
      } else {
        addMessage("Sorry, something went wrong. Please call us directly.", "bot");
      }
    } catch (err) {
      hideTyping();
      addMessage("Connection error. Please try again or call us directly.", "bot");
    } finally {
      setWaiting(false);
      input.focus();
    }
  }

  sendBtn.addEventListener("click", sendMessage);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
})();
