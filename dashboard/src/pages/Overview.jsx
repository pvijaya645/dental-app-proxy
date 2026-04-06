import { useEffect, useState } from "react";
import { MessageSquare, CheckCircle, Clock, BookOpen, User, Copy, Check } from "lucide-react";
import API from "../api/client";

function StatCard({ label, value, icon: Icon, iconBg, iconColor }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-center justify-between">
      <div>
        <div className="text-sm text-slate-600 mb-1">{label}</div>
        <div className="text-3xl font-extrabold text-slate-900">{value}</div>
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
    </div>
  );
}

const STATUS_BADGE = {
  active:    "bg-green-100 text-green-700",
  resolved:  "bg-slate-100 text-slate-600",
  escalated: "bg-red-100 text-red-600",
};

export default function Overview() {
  const business = JSON.parse(localStorage.getItem("ravira_business") || "{}");
  const [conversations, setConversations] = useState([]);
  const [kb, setKb] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    API.get("/api/chat/conversations").then((r) => setConversations(r.data)).catch(() => {});
    API.get("/api/kb").then((r) => setKb(r.data)).catch(() => {});
  }, []);

  const open = conversations.filter((c) => c.status === "active").length;
  const resolved = conversations.filter((c) => c.status === "resolved").length;

  const embedCode = `<script src="http://localhost:8000/widget.js"\n  data-key="${business.widget_api_key}"\n  data-name="${business.name}"\n  data-color="#2563eb">\n</script>`;

  function handleCopy() {
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div>
      {/* Page header */}
      <div className="px-8 py-6 border-b border-slate-100 bg-white">
        <h1 className="text-xl font-bold text-slate-900">Welcome back</h1>
        <p className="text-sm text-slate-500 mt-0.5">{business.name}</p>
      </div>

      <div className="p-8 space-y-8">
        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Total Conversations"
            value={conversations.length}
            icon={MessageSquare}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
          />
          <StatCard
            label="Active Chats"
            value={open}
            icon={Clock}
            iconBg="bg-green-50"
            iconColor="text-green-600"
          />
          <StatCard
            label="Resolved"
            value={resolved}
            icon={CheckCircle}
            iconBg="bg-green-50"
            iconColor="text-green-600"
          />
          <StatCard
            label="KB Entries"
            value={kb.length}
            icon={BookOpen}
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
          />
        </div>

        {/* Recent conversations */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Recent Conversations</h2>
          </div>

          {conversations.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              No conversations yet. Share your widget with patients to get started.
            </div>
          ) : (
            <div>
              {conversations.slice(0, 8).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between px-6 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {c.customer_name || "Anonymous Patient"}
                      </div>
                      <div className="text-xs text-slate-400">
                        {new Date(c.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_BADGE[c.status] || STATUS_BADGE.resolved}`}
                  >
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Widget embed code */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Widget Embed Code</h2>
              <p className="text-xs text-slate-500 mt-0.5">Paste this snippet on your dental office website</p>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer border-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-green-600">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>
          <div className="p-6">
            <pre className="bg-slate-900 text-green-400 font-mono text-xs rounded-xl p-5 overflow-x-auto whitespace-pre-wrap break-all">
              {embedCode}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
