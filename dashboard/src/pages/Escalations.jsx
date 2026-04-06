import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import API from "../api/client";

const URGENCY_BADGE = {
  high:   "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low:    "bg-blue-100 text-blue-700",
};

const URGENCY_BORDER = {
  high:   "border-l-red-500",
  medium: "border-l-yellow-500",
  low:    "border-l-blue-500",
};

const STATUS_BADGE = {
  pending:      "bg-yellow-100 text-yellow-700",
  acknowledged: "bg-blue-100 text-blue-700",
  resolved:     "bg-green-100 text-green-700",
};

const FILTERS = ["all", "pending", "acknowledged", "resolved"];

export default function Escalations() {
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchEscalations();
  }, []);

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

  const filtered =
    filter === "all" ? escalations : escalations.filter((e) => e.status === filter);

  const pending = escalations.filter((e) => e.status === "pending").length;

  return (
    <div>
      {/* Page header */}
      <div className="px-8 py-6 border-b border-slate-100 bg-white flex items-center gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">Escalations</h1>
            {pending > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                {pending} pending
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">Patients flagged for human follow-up</p>
        </div>
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
              <ShieldAlert className="w-6 h-6 text-slate-400" />
            </div>
            <div className="text-base font-semibold text-slate-500 mb-1">No escalations</div>
            <div className="text-sm">Escalations appear when patients need urgent help or request a human</div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((esc) => {
              const conv = esc.conversations || {};
              return (
                <div
                  key={esc.id}
                  className={`bg-white rounded-2xl border border-slate-100 shadow-sm border-l-4 p-6 ${URGENCY_BORDER[esc.urgency] || URGENCY_BORDER.medium}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Badges row */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${URGENCY_BADGE[esc.urgency] || URGENCY_BADGE.medium}`}
                        >
                          {esc.urgency}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_BADGE[esc.status] || STATUS_BADGE.pending}`}
                        >
                          {esc.status}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(esc.created_at).toLocaleString()}
                        </span>
                      </div>

                      {/* Reason */}
                      <div className="text-sm font-semibold text-slate-900 mb-1">
                        {esc.reason}
                      </div>

                      {/* Conversation info */}
                      <div className="text-xs text-slate-400">
                        {conv.customer_name && <span>{conv.customer_name} · </span>}
                        Channel: {conv.channel || "chat"} · Session:{" "}
                        {conv.session_id?.slice(0, 8) || esc.conversation_id?.slice(0, 8)}…
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {esc.status === "pending" && (
                        <button
                          onClick={() => updateStatus(esc.id, "acknowledged")}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer border-0"
                        >
                          Acknowledge
                        </button>
                      )}
                      {esc.status !== "resolved" && (
                        <button
                          onClick={() => updateStatus(esc.id, "resolved")}
                          className="bg-green-50 hover:bg-green-100 text-green-700 text-sm font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer border-0"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
