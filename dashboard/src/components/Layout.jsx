import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, MessageSquare, Calendar, AlertTriangle,
  BookOpen, Settings, LogOut, ChevronRight, Zap
} from "lucide-react";

const nav = [
  { path: "/",              label: "Overview",       icon: LayoutDashboard },
  { path: "/conversations", label: "Conversations",  icon: MessageSquare },
  { path: "/appointments",  label: "Appointments",   icon: Calendar },
  { path: "/escalations",   label: "Escalations",    icon: AlertTriangle },
  { path: "/knowledge",     label: "Knowledge Base", icon: BookOpen },
  { path: "/settings",      label: "Settings",       icon: Settings },
];

export default function Layout({ children }) {
  const location = useLocation();
  const navigate  = useNavigate();
  const business  = JSON.parse(localStorage.getItem("ravira_business") || "{}");

  function logout() {
    localStorage.removeItem("ravira_token");
    localStorage.removeItem("ravira_business");
    navigate("/login");
  }

  const initials = (business.name || "RA")
    .split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-slate-100 flex flex-col shadow-sm">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 tracking-tight">Ravira</div>
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Dental AI</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {nav.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group no-underline ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <Icon
                  size={16}
                  className={active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}
                />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight size={14} className="text-blue-400" />}
              </Link>
            );
          })}
        </nav>

        {/* User / Logout */}
        <div className="px-3 py-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-800 truncate">{business.name || "Your Office"}</div>
              <div className="text-[10px] text-slate-400 truncate">{business.email}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-1 flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer border-0 bg-transparent"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
