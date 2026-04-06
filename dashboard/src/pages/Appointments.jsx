import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import API from "../api/client";

const STATUS_BADGE = {
  pending:   "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

const FILTERS = ["all", "pending", "confirmed", "cancelled"];

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchAppointments();
  }, []);

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

  const filtered =
    filter === "all" ? appointments : appointments.filter((a) => a.status === filter);

  return (
    <div>
      {/* Page header */}
      <div className="px-8 py-6 border-b border-slate-100 bg-white">
        <h1 className="text-xl font-bold text-slate-900">Appointments</h1>
        <p className="text-sm text-slate-500 mt-0.5">{appointments.length} total</p>
      </div>

      <div className="p-8">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors cursor-pointer border-0 capitalize ${
                filter === s
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6 text-slate-400" />
            </div>
            <div className="text-base font-semibold text-slate-500 mb-1">No appointments yet</div>
            <div className="text-sm">Appointments booked via the chat widget will appear here</div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Patient</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Service</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Time</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((appt) => (
                  <tr key={appt.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-slate-900">{appt.patient_name}</div>
                      <div className="text-xs text-slate-400">{appt.patient_phone}</div>
                      {appt.patient_email && (
                        <div className="text-xs text-slate-400">{appt.patient_email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{appt.service_type}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(appt.appointment_date + "T00:00:00").toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {appt.appointment_time?.slice(0, 5)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_BADGE[appt.status] || "bg-slate-100 text-slate-600"}`}
                      >
                        {appt.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {appt.status === "pending" && (
                          <>
                            <button
                              onClick={() => updateStatus(appt.id, "confirmed")}
                              className="bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer border-0"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => updateStatus(appt.id, "cancelled")}
                              className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer border-0"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {appt.status === "confirmed" && (
                          <button
                            onClick={() => updateStatus(appt.id, "cancelled")}
                            className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer border-0"
                          >
                            Cancel
                          </button>
                        )}
                        {appt.status === "cancelled" && (
                          <button
                            onClick={() => updateStatus(appt.id, "pending")}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer border-0"
                          >
                            Restore
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
