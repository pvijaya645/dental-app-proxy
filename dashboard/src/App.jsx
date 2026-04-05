import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import Conversations from "./pages/Conversations";
import Appointments from "./pages/Appointments";
import Escalations from "./pages/Escalations";
import Billing from "./pages/Billing";
import KnowledgeBase from "./pages/KnowledgeBase";
import Settings from "./pages/Settings";

function RequireAuth({ children }) {
  const token = localStorage.getItem("ravira_token");
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={
          <RequireAuth>
            <Layout>
              <Routes>
                <Route path="/"              element={<Overview />} />
                <Route path="/conversations" element={<Conversations />} />
                <Route path="/appointments"  element={<Appointments />} />
                <Route path="/escalations"   element={<Escalations />} />
                <Route path="/billing"       element={<Billing />} />
                <Route path="/knowledge"     element={<KnowledgeBase />} />
                <Route path="/settings"      element={<Settings />} />
              </Routes>
            </Layout>
          </RequireAuth>
        } />
      </Routes>
    </BrowserRouter>
  );
}
