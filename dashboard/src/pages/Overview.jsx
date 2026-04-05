import { useEffect, useState } from "react";
import API from "../api/client";

function StatCard({ label, value, icon, color }) {
  return (
    <div style={{
      background: "white", borderRadius: 12, padding: 24,
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)", flex: 1,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#1e293b" }}>{value}</div>
        </div>
        <div style={{
          width: 52, height: 52, borderRadius: 12,
          background: color, display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 24,
        }}>{icon}</div>
      </div>
    </div>
  );
}

export default function Overview() {
  const business = JSON.parse(localStorage.getItem("ravira_business") || "{}");
  const [conversations, setConversations] = useState([]);
  const [kb, setKb] = useState([]);

  useEffect(() => {
    API.get("/api/chat/conversations").then(r => setConversations(r.data)).catch(() => {});
    API.get("/api/kb").then(r => setKb(r.data)).catch(() => {});
  }, []);

  const open = conversations.filter(c => c.status === "active").length;
  const resolved = conversations.filter(c => c.status === "resolved").length;

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#1e293b" }}>
          Welcome back 👋
        </h1>
        <p style={{ margin: "6px 0 0", color: "#64748b" }}>{business.name}</p>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
        <StatCard label="Total Conversations" value={conversations.length} icon="💬" color="#eff6ff" />
        <StatCard label="Active Chats" value={open} icon="🟢" color="#f0fdf4" />
        <StatCard label="Resolved" value={resolved} icon="✅" color="#f0fdf4" />
        <StatCard label="KB Entries" value={kb.length} icon="📚" color="#faf5ff" />
      </div>

      {/* Recent conversations */}
      <div style={{ background: "white", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1e293b" }}>Recent Conversations</h2>
        </div>
        {conversations.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
            No conversations yet. Share your widget with patients to get started.
          </div>
        ) : (
          conversations.slice(0, 8).map(c => (
            <div key={c.id} style={{
              padding: "14px 24px", borderBottom: "1px solid #f8fafc",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", background: "#eff6ff",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                }}>👤</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>
                    {c.customer_name || "Anonymous Patient"}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>
                    {new Date(c.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
              <span style={{
                padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: c.status === "active" ? "#dcfce7" : c.status === "escalated" ? "#fef2f2" : "#f1f5f9",
                color: c.status === "active" ? "#16a34a" : c.status === "escalated" ? "#dc2626" : "#64748b",
              }}>{c.status}</span>
            </div>
          ))
        )}
      </div>

      {/* Widget embed snippet */}
      <div style={{ background: "#1e293b", borderRadius: 12, padding: 24, marginTop: 24 }}>
        <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 12 }}>
          📋 Your embed code — paste this on your dental office website:
        </div>
        <code style={{ color: "#86efac", fontSize: 12, lineHeight: 1.8, display: "block" }}>
          {`<script src="http://localhost:8000/widget.js"\n  data-key="${business.widget_api_key}"\n  data-name="${business.name}"\n  data-color="#2563eb">\n</script>`}
        </code>
      </div>
    </div>
  );
}
