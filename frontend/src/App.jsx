import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import EnterpriseLayout from "./Components/EnterpriseLayout";
import ProtectedRoute from "./lib/ProtectedRoute";
import Activitylogpage from "./pages/Activitylogpage";
import EnterpriseTablePage from "./pages/EnterpriseTablePage";
import HeroTrackDashboard from "./pages/HeroTrackDashboard";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import Notificationpage from "./pages/Notificationpage";
import NotificationPageRead from "./pages/Notificationpageread";
import ServicePage from "./pages/ServicePage";
import SignupPage from "./pages/SignupPages";
import Userstatus from "./pages/Userstatus";

const legacyRedirects = [
  { path: "product", target: "spare-parts" },
  { path: "category", target: "spare-parts" },
  { path: "supplier", target: "spare-parts" },
  { path: "stock-transaction", target: "movements" },
  { path: "order", target: "requests" },
  { path: "sales", target: "reports" },
  { path: "Profilepage", target: "" },
  { path: "NotificationPageRead", target: "notifications" },
];

const heroTrackPages = [
  { path: "departments", type: "departments", roles: ["admin"] },
  { path: "spare-parts", type: "parts", roles: ["admin", "manager", "staff"] },
  { path: "movements", type: "movements", roles: ["admin", "manager", "staff"] },
  { path: "department-stock", type: "stock", roles: ["admin", "manager", "staff"] },
  { path: "requests", type: "requests", roles: ["admin", "manager", "staff"] },
  { path: "approvals", type: "approvals", roles: ["admin", "manager"] },
  { path: "reports", type: "reports", roles: ["admin", "manager"] },
];

const dashboardConfigs = [
  { path: "/ManagerDashboard", notifications: <NotificationPageRead />, roles: ["manager"] },
  { path: "/AdminDashboard", notifications: <Notificationpage />, roles: ["admin"] },
  { path: "/StaffDashboard", notifications: <NotificationPageRead />, roles: ["staff"] },
];

const protectedElement = (element, allowedRoles) => <ProtectedRoute element={element} allowedRoles={allowedRoles} />;

function DashboardRoutes({ path: dashboardPath, notifications, roles }) {
  return (
    <>
      <Route index element={protectedElement(<HeroTrackDashboard />, roles)} />

      {heroTrackPages.map((page) => (
        <Route
          key={page.path}
          path={page.path}
          element={protectedElement(<EnterpriseTablePage key={page.type} type={page.type} />, page.roles)}
        />
      ))}

      {legacyRedirects.map((redirect) => (
        <Route
          key={redirect.path}
          path={redirect.path}
          element={protectedElement(<Navigate to={`${dashboardPath}/${redirect.target}`} replace />, roles)}
        />
      ))}

      <Route path="activity-log" element={protectedElement(<Activitylogpage />, ["admin", "manager"])} />
      <Route path="notifications" element={protectedElement(notifications, ["admin", "manager", "staff"])} />
      <Route path="Userstatus" element={protectedElement(<Userstatus />, ["admin"])} />
    </>
  );
}

function App() {
  return (
    <Router>
      <Toaster />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<ServicePage />} />
        <Route path="/SignupPage" element={<SignupPage />} />
        <Route path="/LoginPage" element={<LoginPage />} />

        {dashboardConfigs.map((dashboard) => (
          <Route
            key={dashboard.path}
            path={dashboard.path}
            element={protectedElement(<EnterpriseLayout />, dashboard.roles)}
          >
            {DashboardRoutes(dashboard)}
          </Route>
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
