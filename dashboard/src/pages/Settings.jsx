import { useState } from "react";
import { Building2, Phone, MapPin, Clock, Key, CheckCircle, AlertCircle } from "lucide-react";
import API from "../api/client";

const TIMEZONES = [
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Denver",      label: "Mountain Time (MT)" },
  { value: "America/Chicago",     label: "Central Time (CT)" },
  { value: "America/New_York",    label: "Eastern Time (ET)" },
];

const FIELDS = [
  { key: "name",    label: "Practice Name",  placeholder: "Bright Smile Dental",    Icon: Building2 },
  { key: "phone",   label: "Phone Number",   placeholder: "555-123-4567",            Icon: Phone     },
  { key: "address", label: "Address",        placeholder: "123 Main St, City, State", Icon: MapPin   },
];

export default function Settings() {
  const business = JSON.parse(localStorage.getItem("ravira_business") || "{}");
  const [form, setForm] = useState({
    name:     business.name     || "",
    phone:    business.phone    || "",
    address:  business.address  || "",
    timezone: business.timezone || "America/Los_Angeles",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState("");
  const [success, setSuccess] = useState(false);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const r = await API.put("/api/auth/me", form);
      localStorage.setItem("ravira_business", JSON.stringify(r.data));
      setMsg("Settings saved successfully");
      setSuccess(true);
    } catch {
      setMsg("Failed to save settings");
      setSuccess(false);
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";

  return (
    <div>
      {/* Page header */}
      <div className="px-8 py-6 border-b border-slate-100 bg-white">
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your dental office profile</p>
      </div>

      <div className="p-8 max-w-2xl space-y-6">
        {/* Practice profile form */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Practice Profile</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              This information is used by the AI when responding to patients
            </p>
          </div>

          <form onSubmit={save} className="p-6 space-y-5">
            {FIELDS.map(({ key, label, placeholder, Icon }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {label}
                </label>
                <div className="relative">
                  <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    className={inputClass + " pl-10"}
                  />
                </div>
              </div>
            ))}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Timezone
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  value={form.timezone}
                  onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                  className={inputClass + " pl-10"}
                >
                  {TIMEZONES.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {msg && (
              <div
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
                  success
                    ? "bg-green-50 text-green-700 border border-green-100"
                    : "bg-red-50 text-red-600 border border-red-100"
                }`}
              >
                {success ? (
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                {msg}
              </div>
            )}

            <div className="pt-1">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer border-0 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>

        {/* Widget API key */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-900">Widget API Key</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Use this key in your widget embed code
            </p>
          </div>
          <div className="p-6">
            <code className="block bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-mono break-all">
              {business.widget_api_key}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
