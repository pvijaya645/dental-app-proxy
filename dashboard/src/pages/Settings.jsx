import { useState } from "react";
import API from "../api/client";

export default function Settings() {
  const business = JSON.parse(localStorage.getItem("ravira_business") || "{}");
  const [form, setForm] = useState({
    name: business.name || "",
    phone: business.phone || "",
    address: business.address || "",
    timezone: business.timezone || "America/Los_Angeles",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function save(e) {
    e.preventDefault();
    setSaving(true); setMsg("");
    try {
      const r = await API.put("/api/auth/me", form);
      localStorage.setItem("ravira_business", JSON.stringify(r.data));
      setMsg("✅ Settings saved successfully");
    } catch {
      setMsg("❌ Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 32, maxWidth: 600 }}>
      <h1 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 800, color: "#1e293b" }}>Settings</h1>
      <p style={{ margin: "0 0 32px", color: "#64748b" }}>Manage your dental office profile</p>

      <div style={{ background: "white", borderRadius: 12, padding: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <form onSubmit={save}>
          {[
            { key: "name", label: "Practice Name", placeholder: "Bright Smile Dental" },
            { key: "phone", label: "Phone Number", placeholder: "555-123-4567" },
            { key: "address", label: "Address", placeholder: "123 Main St, City, State" },
          ].map(({ key, label, placeholder }) => (
            <div key={key} style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>{label}</label>
              <input
                value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                placeholder={placeholder}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, boxSizing: "border-box", outline: "none" }}
              />
            </div>
          ))}

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Timezone</label>
            <select value={form.timezone} onChange={e => setForm({ ...form, timezone: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, boxSizing: "border-box", outline: "none" }}>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/New_York">Eastern Time (ET)</option>
            </select>
          </div>

          {msg && <div style={{ marginBottom: 16, fontSize: 13, color: msg.startsWith("✅") ? "#16a34a" : "#dc2626" }}>{msg}</div>}

          <button type="submit" disabled={saving} style={{
            background: "#2563eb", color: "white", border: "none",
            padding: "11px 24px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>{saving ? "Saving…" : "Save Changes"}</button>
        </form>
      </div>

      {/* Widget info */}
      <div style={{ background: "white", borderRadius: 12, padding: 28, marginTop: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Widget API Key</div>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>Use this key in your widget embed code</div>
        <code style={{
          display: "block", background: "#f8fafc", border: "1px solid #e2e8f0",
          borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#1e293b", wordBreak: "break-all",
        }}>{business.widget_api_key}</code>
      </div>
    </div>
  );
}
