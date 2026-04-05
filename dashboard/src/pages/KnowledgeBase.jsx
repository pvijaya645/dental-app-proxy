import { useEffect, useState } from "react";
import API from "../api/client";

const CATEGORIES = ["general", "hours", "services", "pricing", "insurance", "location", "policies", "team", "emergency"];

export default function KnowledgeBase() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [form, setForm] = useState({ title: "", content: "", category: "general" });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);

  useEffect(() => { fetchEntries(); }, []);

  async function fetchEntries() {
    setLoading(true);
    const r = await API.get("/api/kb");
    setEntries(r.data);
    setLoading(false);
  }

  async function saveEntry(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        await API.put(`/api/kb/${editId}`, form);
      } else {
        await API.post("/api/kb", form);
      }
      setForm({ title: "", content: "", category: "general" });
      setShowForm(false);
      setEditId(null);
      fetchEntries();
    } catch (err) {
      alert("Error saving entry");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(id) {
    if (!confirm("Delete this KB entry?")) return;
    await API.delete(`/api/kb/${id}`);
    fetchEntries();
  }

  function editEntry(entry) {
    setForm({ title: entry.title, content: entry.content, category: entry.category });
    setEditId(entry.id);
    setShowForm(true);
  }

  async function importFromUrl() {
    if (!importUrl) return;
    setImporting(true);
    setImportMsg("");
    try {
      const r = await API.post("/api/kb/import-from-url", { url: importUrl });
      setImportMsg(`✅ Imported ${r.data.imported} entries from website`);
      setImportUrl("");
      fetchEntries();
    } catch (err) {
      setImportMsg("❌ Failed to import. Check the URL and try again.");
    } finally {
      setImporting(false);
    }
  }

  const categoryColors = {
    hours: "#dbeafe", services: "#dcfce7", pricing: "#fef9c3",
    insurance: "#fce7f3", location: "#ede9fe", policies: "#fee2e2",
    team: "#ffedd5", emergency: "#fecaca", general: "#f1f5f9",
  };

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#1e293b" }}>Knowledge Base</h1>
          <p style={{ margin: "6px 0 0", color: "#64748b" }}>{entries.length} entries · Used by AI to answer patient questions</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ title: "", content: "", category: "general" }); }} style={btnStyle}>
          + Add Entry
        </button>
      </div>

      {/* Import from URL */}
      <div style={{ background: "white", borderRadius: 12, padding: 20, marginBottom: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>🌐 Import from website (Firecrawl)</div>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={importUrl}
            onChange={e => setImportUrl(e.target.value)}
            placeholder="https://www.yourdentaloffice.com"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={importFromUrl} disabled={importing} style={{ ...btnStyle, opacity: importing ? 0.6 : 1 }}>
            {importing ? "Importing…" : "Import"}
          </button>
        </div>
        {importMsg && <div style={{ marginTop: 10, fontSize: 13, color: importMsg.startsWith("✅") ? "#16a34a" : "#dc2626" }}>{importMsg}</div>}
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div style={{ background: "white", borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>{editId ? "Edit Entry" : "New KB Entry"}</h3>
          <form onSubmit={saveEntry}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Title</label>
                <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Office Hours" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={inputStyle}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Content</label>
              <textarea required value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
                placeholder="The information patients need to know…"
                rows={4} style={{ ...inputStyle, resize: "vertical" }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit" disabled={saving} style={btnStyle}>{saving ? "Saving…" : editId ? "Update" : "Save Entry"}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} style={cancelBtnStyle}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Entries list */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Loading…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {entries.map(entry => (
            <div key={entry.id} style={{
              background: "white", borderRadius: 12, padding: 20,
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              borderTop: `3px solid ${categoryColors[entry.category] || "#f1f5f9"}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5,
                  color: "#64748b", background: categoryColors[entry.category] || "#f1f5f9",
                  padding: "2px 8px", borderRadius: 20,
                }}>{entry.category}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => editEntry(entry)} style={iconBtnStyle}>✏️</button>
                  <button onClick={() => deleteEntry(entry.id)} style={iconBtnStyle}>🗑️</button>
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", marginBottom: 8 }}>{entry.title}</div>
              <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{entry.content}</div>
            </div>
          ))}
        </div>
      )}

      {!loading && entries.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No KB entries yet</div>
          <div>Import from your website or add entries manually above</div>
        </div>
      )}
    </div>
  );
}

const btnStyle = {
  background: "#2563eb", color: "white", border: "none",
  padding: "10px 20px", borderRadius: 8, fontSize: 14,
  fontWeight: 600, cursor: "pointer",
};
const cancelBtnStyle = {
  background: "#f1f5f9", color: "#475569", border: "none",
  padding: "10px 20px", borderRadius: 8, fontSize: 14,
  fontWeight: 600, cursor: "pointer",
};
const inputStyle = {
  width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0",
  borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box",
  background: "#f8fafc",
};
const labelStyle = {
  display: "block", fontSize: 12, fontWeight: 600,
  color: "#374151", marginBottom: 6,
};
const iconBtnStyle = {
  background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: 2,
};
