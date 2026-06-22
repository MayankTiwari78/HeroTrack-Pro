import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FiActivity,
  FiAlertTriangle,
  FiBarChart2,
  FiBell,
  FiBox,
  FiCheckSquare,
  FiGrid,
  FiLogOut,
  FiMoon,
  FiSun,
  FiTruck,
  FiUserCheck,
  FiUsers,
  FiLayers,
} from "react-icons/fi";
import heroMotoCorpLogo from "../assets/heromotocorp-logo.png";
import { logout } from "../features/authSlice";

const navSections = [
  {
    label: "Control",
    items: [
      { to: "", label: "Command Center", icon: FiGrid, end: true, roles: ["admin", "manager", "staff"] },
      { to: "reports", label: "Analytics", icon: FiBarChart2, roles: ["admin", "manager"] },
      { to: "notifications", label: "Notifications", icon: FiBell, roles: ["admin", "manager", "staff"] },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "departments", label: "Departments", icon: FiUsers, roles: ["admin"] },
      { to: "spare-parts", label: "Spare Parts", icon: FiBox, roles: ["admin", "manager", "staff"] },
      { to: "movements", label: "Movements", icon: FiTruck, roles: ["admin", "manager", "staff"] },
      { to: "department-stock", label: "Department Stock", icon: FiLayers, roles: ["admin", "manager", "staff"] },
      { to: "requests", label: "Requests", icon: FiCheckSquare, roles: ["admin", "manager", "staff"] },
      { to: "approvals", label: "Approvals", icon: FiAlertTriangle, roles: ["admin", "manager"] },
    ],
  },
  {
    label: "Governance",
    items: [
      { to: "activity-log", label: "Activity Logs", icon: FiActivity, roles: ["admin", "manager"] },
      { to: "Userstatus", label: "User Status", icon: FiUserCheck, roles: ["admin"] },
    ],
  },
];

function EnterpriseLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { Authuser } = useSelector((state) => state.auth);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("hero-theme") === "dark");
  const userRole = Authuser?.role;
  const roleLabel = (userRole || "staff").replace("_", " ");

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    localStorage.setItem("hero-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate("/LoginPage");
  };

  return (
    <div className="enterprise-shell">
      <aside className="enterprise-sidebar">
        <div className="brand-block">
          <div className="brand-mark">
            <img src={heroMotoCorpLogo} alt="Hero MotoCorp" />
          </div>
          <div>
            <h1>HERO MOTOCORP</h1>
            <p>Plant ERP System</p>
          </div>
        </div>
        <div className="sidebar-signal">
          <span>Assembly Line</span>
          <strong>Motorcycle Parts Control</strong>
        </div>

        <nav className="enterprise-nav">
          {navSections.map((section) => {
            const visibleItems = section.items.filter((item) => {
              return item.roles.includes(userRole);
            });
            if (visibleItems.length === 0) return null;

            return (
              <div className="nav-section" key={section.label}>
                <span>{section.label}</span>
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to || "dashboard"}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) => `enterprise-nav-link ${isActive ? "active" : ""}`}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="operator-card">
            <strong>{Authuser?.name || "Hero Operator"}</strong>
            <span>{roleLabel}</span>
          </div>
          <button className="icon-command" onClick={handleLogout} title="Logout">
            <FiLogOut />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="enterprise-main">
        <header className="enterprise-topbar">
          <div>
            <p className="eyebrow">Hero MotoCorp Internal Operations</p>
            <h2>Department Wise Spare Parts Tracking System</h2>
          </div>
          <div className="topbar-actions">
            <span className="status-pill amber">Plant A Shift</span>
            <span className="status-pill">Live Plant Data</span>
            <button
              className="theme-toggle"
              onClick={() => setDarkMode((value) => !value)}
              title="Toggle theme"
              aria-label="Toggle light and dark mode"
            >
              {darkMode ? <FiSun /> : <FiMoon />}
            </button>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}

export default EnterpriseLayout;
