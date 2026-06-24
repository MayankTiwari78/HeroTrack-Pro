import { useDispatch, useSelector } from "react-redux";
import { useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiLogIn,
  FiLogOut,
  FiSearch,
  FiUserPlus,
} from "react-icons/fi";
import { activityLogReceived, getAllActivityLogs } from "../features/activitySlice";
import FormattedTime from "../lib/FormattedTime ";
import socket from "../lib/socket";

const logsPerPage = 10;

const activityFilters = [
  { label: "All", value: "all" },
  { label: "Login", value: "login" },
  { label: "Logout", value: "logout" },
  { label: "User Create", value: "user_create" },
  { label: "Approval", value: "approval" },
];

const roleFilters = [
  { label: "All Roles", value: "all" },
  { label: "Admin", value: "admin" },
  { label: "Manager", value: "manager" },
  { label: "Staff", value: "staff" },
];

const actionMeta = {
  login: { label: "LOGIN", className: "activity-action-badge login" },
  logout: { label: "LOGOUT", className: "activity-action-badge logout" },
  user_create: { label: "USER_CREATE", className: "activity-action-badge user-create" },
  approval: { label: "APPROVAL", className: "activity-action-badge approval" },
  delete: { label: "DELETE", className: "activity-action-badge delete" },
  default: { label: "SYSTEM", className: "activity-action-badge default" },
};

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const normalizeAction = (value) => String(value || "").trim().toUpperCase().replace(/\s+/g, "_");

const getLogUser = (log) => (log?.userId && typeof log.userId === "object" ? log.userId : {});

const getEmployeeId = (log) => {
  const user = getLogUser(log);
  const employeeId = user.employeeId === undefined || user.employeeId === null ? "" : String(user.employeeId).trim();
  const role = normalizeText(user.role);

  if (employeeId) return employeeId;
  if (role === "admin") return "ADMIN";
  return "-";
};

const getRole = (log) => {
  const role = normalizeText(getLogUser(log).role);
  return role || "-";
};

const getActionFamily = (log) => {
  const action = normalizeAction(log?.action);
  const moduleName = normalizeText(log?.module || log?.entity);

  if (action === "LOGIN" || action === "USER_LOGIN") return "login";
  if (action === "LOGOUT" || action === "USER_LOGOUT") return "logout";
  if (action === "USER_CREATE" || action === "CREATE_USER") return "user_create";
  if (action.includes("APPROVAL") || moduleName.includes("approval")) return "approval";
  if (action.includes("DELETE") || action.includes("REMOVE")) return "delete";
  return "default";
};

const getActionMeta = (log) => {
  const family = getActionFamily(log);
  const meta = actionMeta[family] || actionMeta.default;
  return {
    ...meta,
    label: family === "default" ? normalizeAction(log?.action) || meta.label : meta.label,
  };
};

const formatModule = (log) => String(log?.module || log?.entity || "-").replaceAll("_", " ");

const truncateDescription = (description) => {
  const value = String(description || "-");
  return value.length > 24 ? `${value.slice(0, 21)}...` : value;
};

const getLogTime = (log) => {
  const date = new Date(log?.createdAt || 0);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isWithinDateRange = (log, fromDate, toDate) => {
  const logTime = getLogTime(log);
  if (!logTime) return false;

  if (fromDate) {
    const start = new Date(`${fromDate}T00:00:00`);
    if (logTime < start) return false;
  }

  if (toDate) {
    const end = new Date(`${toDate}T23:59:59.999`);
    if (logTime > end) return false;
  }

  return true;
};

function Activitylogpage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [nameSearch, setNameSearch] = useState("");
  const [emailSearch, setEmailSearch] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [activityFilter, setActivityFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { activityLogs, isFetching } = useSelector((state) => state.activity);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getAllActivityLogs());

    const handleActivityLog = (newLog) => {
      dispatch(activityLogReceived(newLog));
      setCurrentPage(1);
    };

    socket.on("newActivityLog", handleActivityLog);

    return () => {
      socket.off("newActivityLog", handleActivityLog);
    };
  }, [dispatch]);

  const summaryCards = useMemo(() => {
    const counts = activityLogs.reduce(
      (result, log) => {
        result.total += 1;
        const family = getActionFamily(log);
        if (family === "login") result.login += 1;
        if (family === "logout") result.logout += 1;
        if (family === "user_create") result.userCreate += 1;
        if (family === "approval") result.approval += 1;
        return result;
      },
      { total: 0, login: 0, logout: 0, userCreate: 0, approval: 0 }
    );

    return [
      { label: "Total Logs", value: counts.total, icon: FiActivity, tone: "blue" },
      { label: "Login Events", value: counts.login, icon: FiLogIn, tone: "green" },
      { label: "Logout Events", value: counts.logout, icon: FiLogOut, tone: "amber" },
      { label: "User Creation Events", value: counts.userCreate, icon: FiUserPlus, tone: "sky" },
      { label: "Approval Events", value: counts.approval, icon: FiCheckCircle, tone: "purple" },
    ];
  }, [activityLogs]);

  const filteredLogs = useMemo(() => {
    const nameTerm = normalizeText(nameSearch);
    const emailTerm = normalizeText(emailSearch);
    const employeeTerm = normalizeText(employeeSearch);

    return activityLogs.filter((log) => {
      const user = getLogUser(log);
      const name = normalizeText(user.name || "System");
      const email = normalizeText(user.email);
      const employeeId = normalizeText(getEmployeeId(log));
      const role = getRole(log);
      const actionFamily = getActionFamily(log);

      if (nameTerm && !name.includes(nameTerm)) return false;
      if (emailTerm && !email.includes(emailTerm)) return false;
      if (employeeTerm && !employeeId.includes(employeeTerm)) return false;
      if (activityFilter !== "all" && actionFamily !== activityFilter) return false;
      if (roleFilter !== "all" && role !== roleFilter) return false;
      if (!isWithinDateRange(log, fromDate, toDate)) return false;

      return true;
    });
  }, [activityFilter, activityLogs, emailSearch, employeeSearch, fromDate, nameSearch, roleFilter, toDate]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / logsPerPage));
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = useMemo(
    () => filteredLogs.slice(indexOfFirstLog, indexOfLastLog),
    [filteredLogs, indexOfFirstLog, indexOfLastLog]
  );

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activityFilter, emailSearch, employeeSearch, fromDate, nameSearch, roleFilter, toDate]);

  const clearFilters = () => {
    setNameSearch("");
    setEmailSearch("");
    setEmployeeSearch("");
    setActivityFilter("all");
    setRoleFilter("all");
    setFromDate("");
    setToDate("");
  };

  return (
    <section className="enterprise-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Governance</p>
          <h1>Activity Logs</h1>
          <span>Audit trail for users, stock actions, approvals and operational changes.</span>
        </div>
        <span className="status-pill">{filteredLogs.length} visible events</span>
      </div>

      <div className="activity-summary-grid">
        {summaryCards.map(({ label, value, icon: Icon, tone }) => (
          <article className={`activity-summary-card ${tone}`} key={label}>
            <div>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
            <i aria-hidden="true"><Icon /></i>
          </article>
        ))}
      </div>

      <div className="activity-filter-panel">
        <div className="activity-search-grid">
          <label>
            <span>Search by Name</span>
            <div className="activity-input-shell">
              <FiSearch aria-hidden="true" />
              <input value={nameSearch} onChange={(event) => setNameSearch(event.target.value)} placeholder="Name" />
            </div>
          </label>
          <label>
            <span>Search by Email</span>
            <div className="activity-input-shell">
              <FiSearch aria-hidden="true" />
              <input value={emailSearch} onChange={(event) => setEmailSearch(event.target.value)} placeholder="Email" />
            </div>
          </label>
          <label>
            <span>Search by Employee ID</span>
            <div className="activity-input-shell">
              <FiSearch aria-hidden="true" />
              <input value={employeeSearch} onChange={(event) => setEmployeeSearch(event.target.value)} placeholder="EMP001" />
            </div>
          </label>
          <label>
            <span>From Date</span>
            <div className="activity-input-shell">
              <FiCalendar aria-hidden="true" />
              <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            </div>
          </label>
          <label>
            <span>To Date</span>
            <div className="activity-input-shell">
              <FiCalendar aria-hidden="true" />
              <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
            </div>
          </label>
        </div>

        <div className="activity-filter-row">
          <div>
            <span className="filter-label">Activity</span>
            <div className="activity-chip-group" aria-label="Filter activity type">
              {activityFilters.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={`activity-chip ${activityFilter === option.value ? "active" : ""}`}
                  onClick={() => setActivityFilter(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="filter-label">Role</span>
            <div className="activity-chip-group" aria-label="Filter user role">
              {roleFilters.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={`activity-chip ${roleFilter === option.value ? "active" : ""}`}
                  onClick={() => setRoleFilter(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="activity-clear-button" onClick={clearFilters}>Clear</button>
        </div>
      </div>

      <div className="data-panel">
        <table className="enterprise-table">
          <thead>
              <tr>
                <th>#</th>
                <th>EMP ID</th>
                <th>User Details</th>
                <th>Role</th>
                <th>Action</th>
                <th>Module</th>
                <th>Session</th>
                <th>Date</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {currentLogs.length > 0 ? (
                currentLogs.map((log, index) => {
                  console.log("LOG DATA:", log);
                  const user = getLogUser(log);
                  const action = getActionMeta(log);
                  const description = String(log.description || "-");
                  return (
                    <tr key={log._id || `${log.action}-${index}`}>
                      <td>{indexOfFirstLog + index + 1}</td>
                      <td><span className="employee-id-pill">{getEmployeeId(log)}</span></td>
                      <td>
                        <div className="activity-user-cell">
                          <strong>{user.name || "System"}</strong>
                          <span>{user.email || "-"}</span>
                        </div>
                      </td>
                      <td><span className="activity-role-pill">{getRole(log)}</span></td>
                      <td>
                        <div className="activity-action-cell">
                          <span className={action.className}>{action.label}</span>
                          <span className="activity-description" title={description}>
                            {truncateDescription(description)}
                          </span>
                        </div>
                      </td>
                      <td className="capitalize">{formatModule(log)}</td>
                      <td>{log.duration ? `${Number(log.duration).toFixed(2)} min` : "-"}</td>
                      <td>
                        <FormattedTime timestamp={log.createdAt} />
                      </td>
                      <td>{log.ipAddress || "-"}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="text-center py-4">
                    <p>{isFetching ? "Loading activity logs..." : "No activity logs match the current filters."}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
        <div className="pagination-row">
          <button
            className="sync-button"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            aria-label="Previous page"
          >
            <FiChevronLeft aria-hidden="true" /> Prev
          </button>
          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index}
              className={`page-button ${currentPage === index + 1 ? "active" : ""}`}
              onClick={() => setCurrentPage(index + 1)}
            >
              {index + 1}
            </button>
          ))}
          <button
            className="sync-button"
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            aria-label="Next page"
          >
            Next <FiChevronRight aria-hidden="true" />
          </button>
        </div>
        )}
    </section>
  );
}

export default Activitylogpage;
