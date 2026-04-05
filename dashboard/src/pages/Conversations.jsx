import { useEffect, useState } from "react";
import API from "../api/client";

export default function Conversations() {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/api/chat/conversations")
      .then(r => setConversations(r.data))
      .finally(() => setLoading(false));
  }, []);

  async function selectConversation(conv) {
    setSelected(conv);
    const r = await API.get(`/api/chat/conversations/${conv.id}/messages`);
    setMessages(r.data);
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Conversation list */}
      <div style={{
        width: 320, background: "white", borderRight: "1px solid #e2e8f0",
        overflow: "auto",
      }}>
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #f1f5f9" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Conversations</h2>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{conversations.length} total</div>
        </div>

        {loading && <div style={{ padding: 20, color: "#94a3b8", fontSize: 14 }}>Loading…</div>}

        {conversations.map(c => (
          <div key={c.id} onClick={() => selectConversation(c)} style={{
            padding: "14px 20px", borderBottom: "1px solid #f8fafc", cursor: "pointer",
            background: selected?.id === c.id ? "#eff6ff" : "white",
            borderLeft: selected?.id === c.id ? "3px solid #2563eb" : "3px solid transparent",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>
                {c.customer_name || "Anonymous Patient"}
              </div>
              <span style={{
                padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 600,
                background: c.status === "active" ? "#dcfce7" : c.status === "escalated" ? "#fef2f2" : "#f1f5f9",
                color: c.status === "active" ? "#16a34a" : c.status === "escalated" ? "#dc2626" : "#64748b",
              }}>{c.status}</span>
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              {c.channel} · {new Date(c.created_at).toLocaleDateString()}
            </div>
          </div>
        ))}

        {!loading && conversations.length === 0 && (
          <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
            No conversations yet
          </div>
        )}
      </div>

      {/* Message thread */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f8fafc" }}>
        {!selected ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
              <div>Select a conversation to view messages</div>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ background: "white", padding: "16px 24px", borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{selected.customer_name || "Anonymous Patient"}</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                Started {new Date(selected.created_at).toLocaleString()} · {selected.channel}
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflow: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
              {messages.map(m => (
                <div key={m.id} style={{
                  display: "flex",
                  justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                }}>
                  <div style={{
                    maxWidth: "70%", padding: "10px 14px", borderRadius: 12,
                    background: m.role === "user" ? "#2563eb" : "white",
                    color: m.role === "user" ? "white" : "#1e293b",
                    fontSize: 14, lineHeight: 1.5,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                    borderBottomRightRadius: m.role === "user" ? 4 : 12,
                    borderBottomLeftRadius: m.role === "assistant" ? 4 : 12,
                  }}>
                    {m.content}
                    <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: "right" }}>
                      {m.intent && `${m.intent} · `}{new Date(m.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
