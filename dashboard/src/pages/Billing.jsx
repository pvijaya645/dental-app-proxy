import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../api/client";

const STATUS_COLORS = {
  trialing:  { bg: "#dbeafe", color: "#1e40af", label: "Free Trial" },
  active:    { bg: "#dcfce7", color: "#166534", label: "Active" },
  past_due:  { bg: "#fee2e2", color: "#991b1b", label: "Past Due" },
  cancelled: { bg: "#f1f5f9", color: "#475569", label: "Cancelled" },
  paused:    { bg: "#fef9c3", color: "#854d0e", label: "Paused" },
};

export default function Billing() {
  const [plans, setPlans] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [searchParams] = useSearchParams();

  const successMsg = searchParams.get("success");
  const cancelledMsg = searchParams.get("cancelled");

  useEffect(() => {
    Promise.all([
      API.get("/api/billing/plans"),
      API.get("/api/billing/status"),
    ]).then(([plansRes, statusRes]) => {
      setPlans(plansRes.data);
      setStatus(statusRes.data);
    }).finally(() => setLoading(false));
  }, []);

  async function handleCheckout(planId) {
    setCheckingOut(planId);
    try {
      const r = await API.post("/api/billing/checkout", { plan: planId });
      window.location.href = r.data.url;
    } catch (err) {
      alert(err.response?.data?.detail || "Checkout failed. Make sure Stripe is configured.");
      setCheckingOut(null);
    }
  }

  async function handlePortal() {
    setOpeningPortal(true);
    try {
      const r = await API.post("/api/billing/portal");
      window.location.href = r.data.url;
    } catch (err) {
      alert(err.response?.data?.detail || "Could not open billing portal.");
      setOpeningPortal(false);
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading…</div>;

  const statusInfo = STATUS_COLORS[status?.subscription_status] || STATUS_COLORS.trialing;

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 800, color: "#1e293b" }}>Billing</h1>
      <p style={{ margin: "0 0 28px", color: "#64748b" }}>Manage your Ravira subscription</p>

      {/* Success / cancelled banners */}
      {successMsg && (
        <div style={{ background: "#dcfce7", color: "#166534", borderRadius: 10, padding: "14px 20px", marginBottom: 20, fontWeight: 600 }}>
          ✅ Payment successful! Your plan has been activated. Welcome aboard!
        </div>
      )}
      {cancelledMsg && (
        <div style={{ background: "#fef9c3", color: "#854d0e", borderRadius: 10, padding: "14px 20px", marginBottom: 20 }}>
          Checkout was cancelled. Your current plan is unchanged.
        </div>
      )}

      {/* Current plan card */}
      <div style={{
        background: "white", borderRadius: 12, padding: 24,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 32,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>Current Plan</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#1e293b" }}>
            {status?.plan_name} — ${status?.plan_price}/mo
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <span style={{
              padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700,
              background: statusInfo.bg, color: statusInfo.color,
            }}>{statusInfo.label}</span>
            {status?.subscription_status === "trialing" && (
              <span style={{ fontSize: 12, color: "#64748b" }}>14-day free trial</span>
            )}
          </div>
          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {status?.features?.map(f => (
              <span key={f} style={{
                fontSize: 12, padding: "2px 8px",
                background: "#f1f5f9", color: "#475569", borderRadius: 20,
              }}>✓ {f}</span>
            ))}
          </div>
        </div>
        <button
          onClick={handlePortal}
          disabled={openingPortal || !status?.has_stripe}
          style={{
            padding: "10px 20px", borderRadius: 8, border: "1px solid #e2e8f0",
            background: "white", color: "#1e293b", fontSize: 14, fontWeight: 600,
            cursor: status?.has_stripe ? "pointer" : "not-allowed",
            opacity: status?.has_stripe ? 1 : 0.4,
          }}
        >
          {openingPortal ? "Opening…" : "Manage Billing"}
        </button>
      </div>

      {/* Plan cards */}
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 16 }}>
        {status?.subscription_status === "trialing" ? "Choose a plan to continue after trial" : "Change plan"}
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {plans.map(plan => (
          <div key={plan.id} style={{
            background: "white", borderRadius: 16, padding: 28,
            boxShadow: plan.is_current ? `0 0 0 2px ${plan.color}` : "0 1px 4px rgba(0,0,0,0.06)",
            position: "relative", transition: "box-shadow 0.2s",
          }}>
            {plan.is_current && (
              <div style={{
                position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
                background: plan.color, color: "white",
                padding: "2px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                whiteSpace: "nowrap",
              }}>Current plan</div>
            )}
            <div style={{ fontSize: 18, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>{plan.name}</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: plan.color, marginBottom: 4 }}>
              ${plan.price}<span style={{ fontSize: 14, fontWeight: 400, color: "#64748b" }}>/mo</span>
            </div>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>{plan.description}</div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 8 }}>
              {plan.features.map(f => (
                <li key={f} style={{ fontSize: 13, color: "#475569", display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ color: plan.color, fontWeight: 700, flexShrink: 0 }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleCheckout(plan.id)}
              disabled={plan.is_current || checkingOut === plan.id}
              style={{
                width: "100%", padding: "11px", borderRadius: 8, border: "none",
                background: plan.is_current ? "#f1f5f9" : plan.color,
                color: plan.is_current ? "#94a3b8" : "white",
                fontSize: 14, fontWeight: 700,
                cursor: plan.is_current ? "default" : "pointer",
                opacity: checkingOut && checkingOut !== plan.id ? 0.5 : 1,
              }}
            >
              {plan.is_current
                ? "Current plan"
                : checkingOut === plan.id
                ? "Redirecting…"
                : `Start 14-day trial`}
            </button>
          </div>
        ))}
      </div>

      {/* Stripe config notice */}
      {!status?.has_stripe && (
        <div style={{
          background: "#fef9c3", border: "1px solid #fde047", borderRadius: 10,
          padding: "16px 20px", marginTop: 24, fontSize: 13, color: "#854d0e",
        }}>
          <strong>⚙️ Stripe not configured yet.</strong> Add your Stripe keys to{" "}
          <code style={{ background: "#fef3c7", padding: "1px 6px", borderRadius: 4 }}>backend/.env</code>{" "}
          to enable payments. See setup instructions below.
        </div>
      )}

      {/* Setup instructions */}
      <div style={{ background: "#1e293b", borderRadius: 12, padding: 24, marginTop: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 12 }}>
          🔑 Required .env keys for Stripe:
        </div>
        <code style={{ color: "#86efac", fontSize: 12, lineHeight: 2, display: "block" }}>
          {`STRIPE_SECRET_KEY=sk_live_...\nSTRIPE_WEBHOOK_SECRET=whsec_...\nSTRIPE_PRICE_STARTER=price_...\nSTRIPE_PRICE_GROWTH=price_...\nSTRIPE_PRICE_PRO=price_...`}
        </code>
      </div>
    </div>
  );
}
