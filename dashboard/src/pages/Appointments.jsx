import { useEffect, useState } from "react";
import API from "../api/client";

const STATUS_COLORS = {
  pending:   { bg: "#fef9c3", color: "#854d0e" },
  confirmed: { bg: "#dcfce7", color: "#166534" },
  cancelled: { bg: "#fee2e2", color: "#991b1b" },
};

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => { fetchAppointments(); }, []);

  async function fetchAppointments() {
    setLoading(true);
    const r = await API.get("/api/appointments");
    setAppointments(r.data);
    setLoading(false);
  }

  async function updateStatus(id, status) {
    await API.patch(`/api/appointments/${id}`, { status });
    fetchAppointments();
  }

  const filtered = filter === "all"
    ? appointments
    : appointments.filter(a => a.status === filter);

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#1e293b" }}>Appointments</h1>
        <p style={{ margin: "6px 0 0", color: "#64748b" }}>{appointments.length} total</p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {["all", "pending", "confirmed", "cancelled"].map(s => (
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
          <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No appointments yet</div>
          <div>Appointments booked via the chat widget will appear here</div>
        </div>
      ) : (
        <div style={{ background: "white", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          {/* Table header */}
          <div style={{
            display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1.2fr 1fr 1fr",
            padding: "12px 20px", background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0", fontSize: 12,
            fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5,
          }}>
            <div>Patient</div>
            <div>Service</div>
            <div>Date</div>
            <div>Time</div>
            <div>Status</div>
            <div>Actions</div>
          </div>

          {filtered.map(appt => (
            <div key={appt.id} style={{
              display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1.2fr 1fr 1fr",
              padding: "16px 20px", borderBottom: "1px solid #f8fafc",
              alignItems: "center",
            }}>
              {/* Patient */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{appt.patient_name}</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>{appt.patient_phone}</div>
                {appt.patient_email && <div style={{ fontSize: 12, color: "#94a3b8" }}>{appt.patient_email}</div>}
              </div>

              {/* Service */}
              <div style={{ fontSize: 14, color: "#475569" }}>{appt.service_type}</div>

              {/* Date */}
              <div style={{ fontSize: 14, color: "#475569" }}>
                {new Date(appt.appointment_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>

              {/* Time */}
              <div style={{ fontSize: 14, color: "#475569" }}>
                {appt.appointment_time?.slice(0, 5)}
              </div>

              {/* Status badge */}
              <div>
                <span style={{
                  padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: STATUS_COLORS[appt.status]?.bg || "#f1f5f9",
                  color: STATUS_COLORS[appt.status]?.color || "#475569",
                  textTransform: "capitalize",
                }}>{appt.status}</span>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 6 }}>
                {appt.status === "pending" && (
                  <>
                    <button onClick={() => updateStatus(appt.id, "confirmed")} style={{
                      padding: "4px 10px", borderRadius: 6, border: "none",
                      background: "#dcfce7", color: "#166534",
                      fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}>Confirm</button>
                    <button onClick={() => updateStatus(appt.id, "cancelled")} style={{
                      padding: "4px 10px", borderRadius: 6, border: "none",
                      background: "#fee2e2", color: "#991b1b",
                      fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}>Cancel</button>
                  </>
                )}
                {appt.status === "confirmed" && (
                  <button onClick={() => updateStatus(appt.id, "cancelled")} style={{
                    padding: "4px 10px", borderRadius: 6, border: "none",
                    background: "#fee2e2", color: "#991b1b",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}>Cancel</button>
                )}
                {appt.status === "cancelled" && (
                  <button onClick={() => updateStatus(appt.id, "pending")} style={{
                    padding: "4px 10px", borderRadius: 6, border: "none",
                    background: "#f1f5f9", color: "#475569",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}>Restore</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
