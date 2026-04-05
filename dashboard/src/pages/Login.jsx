import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/client";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await API.post("/api/auth/login", form);
      localStorage.setItem("ravira_token", res.data.access_token);
      localStorage.setItem("ravira_business", JSON.stringify(res.data.business));
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #1e40af 0%, #2563eb 100%)",
    }}>
      <div style={{
        background: "white", borderRadius: 16, padding: 40,
        width: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🦷</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#1e293b" }}>Ravira Dashboard</h1>
          <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 14 }}>Sign in to your dental office account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Email</label>
            <input
              type="email" required value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              style={inputStyle}
              placeholder="you@dentaloffice.com"
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Password</label>
            <input
              type="password" required value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              style={inputStyle}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div style={{ background: "#fef2f2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: "100%", padding: "12px", background: "#2563eb", color: "white",
            border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
          }}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "10px 14px", border: "1px solid #e2e8f0",
  borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box",
  background: "#f8fafc",
};
