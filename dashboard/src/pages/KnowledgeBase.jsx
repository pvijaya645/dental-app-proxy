import { useEffect, useState } from "react";
import { BookOpen, Plus, Pencil, Trash2, Globe, X } from "lucide-react";
import API from "../api/client";

const CATEGORIES = [
  "general", "hours", "services", "pricing",
  "insurance", "location", "policies", "team", "emergency",
];

const CATEGORY_STYLES = {
  hours:     "bg-blue-100 text-blue-700",
  services:  "bg-green-100 text-green-700",
  pricing:   "bg-yellow-100 text-yellow-700",
  insurance: "bg-pink-100 text-pink-700",
  location:  "bg-violet-100 text-violet-700",
  policies:  "bg-red-100 text-red-700",
  team:      "bg-orange-100 text-orange-700",
  emergency: "bg-red-200 text-red-800",
  general:   "bg-slate-100 text-slate-600",
};

const CATEGORY_BORDER = {
  hours:     "border-t-blue-400",
  services:  "border-t-green-400",
  pricing:   "border-t-yellow-400",
  insurance: "border-t-pink-400",
  location:  "border-t-violet-400",
  policies:  "border-t-red-400",
  team:      "border-t-orange-400",
  emergency: "border-t-red-600",
  general:   "border-t-slate-300",
};

export default function KnowledgeBase() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [importSuccess, setImportSuccess] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", category: "general" });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    fetchEntries();
  }, []);

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
    } catch {
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

  function openAddForm() {
    setForm({ title: "", content: "", category: "general" });
    setEditId(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditId(null);
  }

  async function importFromUrl() {
    if (!importUrl) return;
    setImporting(true);
    setImportMsg("");
    try {
      const r = await API.post("/api/kb/import-from-url", { url: importUrl });
      setImportMsg(`Imported ${r.data.imported} entries from website`);
      setImportSuccess(true);
      setImportUrl("");
      fetchEntries();
    } catch {
      setImportMsg("Failed to import. Check the URL and try again.");
      setImportSuccess(false);
    } finally {
      setImporting(false);
    }
  }

  const inputClass =
    "w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
  const labelClass = "block text-xs font-semibold text-slate-700 mb-1.5";

  return (
    <div>
      {/* Page header */}
      <div className="px-8 py-6 border-b border-slate-100 bg-white flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Knowledge Base</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {entries.length} {entries.length === 1 ? "entry" : "entries"} · Used by AI to answer patient questions
          </p>
        </div>
        <button
          onClick={openAddForm}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer border-0"
        >
          <Plus className="w-4 h-4" />
          Add Entry
        </button>
      </div>

      <div className="p-8 space-y-6">
        {/* Import from URL */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-bold text-slate-900">Import from Website</span>
            <span className="text-xs text-slate-400 font-medium">via Firecrawl</span>
          </div>
          <div className="flex gap-3">
            <input
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="https://www.yourdentaloffice.com"
              className={inputClass + " flex-1"}
            />
            <button
              onClick={importFromUrl}
              disabled={importing}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer border-0 disabled:opacity-60 disabled:cursor-not-allowed flex-shrink-0"
            >
              {importing ? "Importing…" : "Import"}
            </button>
          </div>
          {importMsg && (
            <p className={`mt-3 text-sm font-medium ${importSuccess ? "text-green-600" : "text-red-600"}`}>
              {importMsg}
            </p>
          )}
        </div>

        {/* Add / Edit form panel */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {editId ? "Edit Entry" : "New KB Entry"}
              </h3>
              <button
                onClick={closeForm}
                className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer border-0"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <form onSubmit={saveEntry} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Title</label>
                  <input
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Office Hours"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className={inputClass}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Content</label>
                <textarea
                  required
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="The information patients need to know…"
                  rows={4}
                  className={inputClass + " resize-y"}
                />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer border-0 disabled:opacity-60"
                >
                  {saving ? "Saving…" : editId ? "Update Entry" : "Save Entry"}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer border-0"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Entries grid */}
        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6 text-slate-400" />
            </div>
            <div className="text-base font-semibold text-slate-500 mb-1">No KB entries yet</div>
            <div className="text-sm">Import from your website or add entries manually above</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className={`bg-white rounded-2xl border border-slate-100 shadow-sm border-t-4 p-5 flex flex-col ${CATEGORY_BORDER[entry.category] || CATEGORY_BORDER.general}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${CATEGORY_STYLES[entry.category] || CATEGORY_STYLES.general}`}
                  >
                    {entry.category}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => editEntry(entry)}
                      className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer border-0 bg-transparent"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer border-0 bg-transparent"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>
                <div className="text-sm font-bold text-slate-900 mb-2">{entry.title}</div>
                <div className="text-xs text-slate-500 leading-relaxed line-clamp-4 flex-1">
                  {entry.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
