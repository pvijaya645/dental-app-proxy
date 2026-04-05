import { Link, useLocation, useNavigate } from "react-router-dom";

const nav = [
  { path: "/",              label: "Overview",      icon: "📊" },
  { path: "/conversations", label: "Conversations", icon: "💬" },
  { path: "/appointments",  label: "Appointments",  icon: "📅" },
  { path: "/escalations",   label: "Escalations",   icon: "🚨" },
  { path: "/knowledge",     label: "Knowledge Base",icon: "📚" },
  // { path: "/billing",        label: "Billing",       icon: "💳" },  // Sprint 8 — activate when Stripe is configured
  { path: "/settings",      label: "Settings",      icon: "⚙️"  },
];

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const business = JSON.parse(localStorage.getItem("ravira_business") || "{}");

  function logout() {
    localStorage.removeItem("ravira_token");
    localStorage.removeItem("ravira_business");
    navigate("/login");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      {/* Sidebar */}
      <aside style={{
        width: 240, background: "#1e40af", color: "white",
        display: "flex", flexDirection: "column", padding: "24px 0",
      }}>
        {/* Logo */}
        <div style={{ padding: "0 24px 32px" }}>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>🦷 Ravira</div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>AI Dental Receptionist</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1 }}>
          {nav.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 24px", textDecoration: "none",
                color: active ? "white" : "rgba(255,255,255,0.7)",
                background: active ? "rgba(255,255,255,0.15)" : "transparent",
                borderLeft: active ? "3px solid white" : "3px solid transparent",
                fontWeight: active ? 600 : 400, fontSize: 14,
                transition: "all 0.15s",
              }}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Business info + logout */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.15)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{business.name || "Your Office"}</div>
          <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 12 }}>{business.email}</div>
          <button onClick={logout} style={{
            background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
            color: "white", padding: "6px 14px", borderRadius: 6,
            fontSize: 12, cursor: "pointer", width: "100%",
          }}>Sign Out</button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, background: "#f8fafc", overflow: "auto" }}>
        {children}
      </main>
    </div>
  );
}
