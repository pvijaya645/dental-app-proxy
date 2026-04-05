import { useEffect, useState } from "react";
import API from "../api/client";

const URGENCY = {
  high:   { bg: "#fee2e2", color: "#991b1b", icon: "🚨" },
  medium: { bg: "#fef9c3", color: "#854d0e", icon: "⚠️" },
  low:    { bg: "#dbeafe", color: "#1e40af", icon: "ℹ️"  },
};

const STATUS = {
  pending:      { bg: "#fef9c3", color: "#854d0e" },
  acknowledged: { bg: "#dbeafe", color: "#1e40af" },
  resolved:     { bg: "#dcfce7", color: "#166534" },
};

export default function Escalations() {
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => { fetchEscalations(); }, []);

  async function fetchEscalations() {
    setLoading(true);
    const r = await API.get("/api/escalations");
    setEscalations(r.data);
    setLoading(false);
  }

  async function updateStatus(id, status) {
    await API.patch(`/api/escalations/${id}`, { status });
    fetchEscalations();
  }

  const filtered = filter === "all"
    ? escalations
    : escalations.filter(e => e.status === filter);

  const pending = escalations.filter(e => e.status === "pending").length;

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#1e293b" }}>Escalations</h1>
          {pending > 0 && (
            <span style={{
              background: "#dc2626", color: "white",
              borderRadius: 20, padding: "2px 10px",
              fontSize: 13, fontWeight: 700,
            }}>{pending} pending</span>
          )}
        </div>
        <p style={{ margin: "6px 0 0", color: "#64748b" }}>
          Patients flagged for human follow-up
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {["all", "pending", "acknowledged", "resolved"].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: "7px 16px", borderRadius: 20, border: "none",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            background: filter === s ? "#2563eb" : "#f1f5f9",
            color: filter === s ? "white" : "#475569",
            textTransform: "capitalize",
          }}>{s}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No escalations</div>
          <div>Escalations appear when patients need urgent help or request a human</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(esc => {
            const u = URGENCY[esc.urgency] || URGENCY.medium;
            const s = STATUS[esc.status] || STATUS.pending;
            const conv = esc.conversations || {};
            return (
              <div key={esc.id} style={{
                background: "white", borderRadius: 12,
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                borderLeft: `4px solid ${u.color}`,
                padding: 20,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    {/* Header row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <span style={{
                        padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                        background: u.bg, color: u.color,
                      }}>{u.icon} {esc.urgency.toUpperCase()}</span>
                      <span style={{
                        padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                        background: s.bg, color: s.color, textTransform: "capitalize",
                      }}>{esc.status}</span>
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>
                        {new Date(esc.created_at).toLocaleString()}
                      </span>
                    </div>

                    {/* Reason */}
                    <div style={{ fontSize: 14, color: "#1e293b", fontWeight: 500, marginBottom: 4 }}>
                      {esc.reason}
                    </div>

                    {/* Conversation info */}
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>
                      {conv.customer_name && <span>{conv.customer_name} · </span>}
                      Channel: {conv.channel || "chat"} ·
                      Session: {conv.session_id?.slice(0, 8) || esc.conversation_id?.slice(0, 8)}...
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 8, marginLeft: 16 }}>
                    {esc.status === "pending" && (
                      <button onClick={() => updateStatus(esc.id, "acknowledged")} style={{
                        padding: "6px 14px", borderRadius: 6, border: "none",
                        background: "#dbeafe", color: "#1e40af",
                        fontSize: 12, fontWeight: 600, cursor: "pointer",
                      }}>Acknowledge</button>
                    )}
                    {esc.status !== "resolved" && (
                      <button onClick={() => updateStatus(esc.id, "resolved")} style={{
                        padding: "6px 14px", borderRadius: 6, border: "none",
                        background: "#dcfce7", color: "#166534",
                        fontSize: 12, fontWeight: 600, cursor: "pointer",
                      }}>Resolve</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
