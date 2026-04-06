import { useEffect, useState } from "react";
import { MessageSquare, User } from "lucide-react";
import API from "../api/client";

const STATUS_BADGE = {
  active:    "bg-green-100 text-green-700",
  resolved:  "bg-slate-100 text-slate-600",
  escalated: "bg-red-100 text-red-600",
};

export default function Conversations() {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/api/chat/conversations")
      .then((r) => setConversations(r.data))
      .finally(() => setLoading(false));
  }, []);

  async function selectConversation(conv) {
    setSelected(conv);
    const r = await API.get(`/api/chat/conversations/${conv.id}/messages`);
    setMessages(r.data);
  }

  return (
    <div className="flex h-screen">
      {/* Conversation list */}
      <div className="w-80 bg-white border-r border-slate-100 flex flex-col flex-shrink-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Conversations</h2>
          <p className="text-xs text-slate-400 mt-0.5">{conversations.length} total</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="px-5 py-4 text-sm text-slate-400">Loading…</div>
          )}

          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => selectConversation(c)}
              className={`w-full text-left px-5 py-4 border-b border-slate-50 border-l-2 transition-colors cursor-pointer ${
                selected?.id === c.id
                  ? "bg-blue-50 border-l-blue-600"
                  : "bg-white border-l-transparent hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-sm font-semibold text-slate-900 truncate">
                  {c.customer_name || "Anonymous Patient"}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize flex-shrink-0 ${STATUS_BADGE[c.status] || STATUS_BADGE.resolved}`}
                >
                  {c.status}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                {c.channel} · {new Date(c.created_at).toLocaleDateString()}
              </div>
            </button>
          ))}

          {!loading && conversations.length === 0 && (
            <div className="px-5 py-10 text-center text-slate-400 text-sm">
              No conversations yet
            </div>
          )}
        </div>
      </div>

      {/* Message thread */}
      <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm">Select a conversation to view messages</p>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="bg-white px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {selected.customer_name || "Anonymous Patient"}
                  </div>
                  <div className="text-xs text-slate-400">
                    Started {new Date(selected.created_at).toLocaleString()} · {selected.channel}
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      m.role === "user"
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-white text-slate-900 rounded-bl-sm"
                    }`}
                  >
                    {m.content}
                    <div className={`text-xs mt-1 text-right opacity-60`}>
                      {m.intent && `${m.intent} · `}
                      {new Date(m.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
