import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { useDispatch, useSelector } from "react-redux";
import { FiClock, FiRefreshCw, FiSearch, FiTrash2, FiUsers, FiWifi, FiWifiOff } from "react-icons/fi";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import { getUserActivityStatus, removeusers } from "../features/authSlice";
import socket from "../lib/socket";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip
);

const statusMeta = {
  online: { label: "Online", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  idle: { label: "Idle", dot: "bg-amber-400", badge: "bg-amber-50 text-amber-700 ring-amber-200" },
  offline: { label: "Offline", dot: "bg-red-500", badge: "bg-red-50 text-red-700 ring-red-200" },
};
const emptyList = [];
const defaultSummary = {
  total: 0,
  online: 0,
  idle: 0,
  offline: 0,
  roles: { admin: 0, manager: 0, staff: 0 },
};
const filterOptions = ["all", "online", "idle", "offline", "admin", "manager", "staff"];

const formatRelative = (value) => {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Never" : `${formatDistanceToNow(date)} ago`;
};

const formatDateTime = (value) => {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Never" : date.toLocaleString();
};

const formatActiveTime = (minutes) => {
  const total = Math.max(0, Number(minutes) || 0);
  const hours = Math.floor(total / 60);
  const mins = Math.round(total % 60);
  return hours ? `${hours}h ${mins}m` : `${mins}m`;
};

const chartOptions = (title) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 8 } },
    title: { display: true, text: title, align: "start", color: "#172033", font: { size: 15, weight: "bold" } },
  },
  scales: title === "Online vs Offline" ? undefined : { y: { beginAtZero: true, ticks: { precision: 0 } } },
});
const roleChartOptions = chartOptions("Role-wise User Count");
const presenceChartOptions = chartOptions("Online vs Offline");
const loginChartOptions = chartOptions("Daily Login Activity (UTC)");

function Userstatus() {
  const dispatch = useDispatch();
  const userActivityStatus = useSelector((state) => state.auth.userActivityStatus);
  const isFetchingUserActivity = useSelector((state) => state.auth.isFetchingUserActivity);
  const authUserId = useSelector((state) => state.auth.Authuser?.id || state.auth.Authuser?._id);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const refreshInFlight = useRef(false);

  const refresh = useCallback(() => {
    if (refreshInFlight.current) return Promise.resolve();
    refreshInFlight.current = true;

    return dispatch(getUserActivityStatus()).finally(() => {
      refreshInFlight.current = false;
    });
  }, [dispatch]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    const handlePresence = () => refresh();
    socket.on("presence:update", handlePresence);
    return () => {
      clearInterval(interval);
      socket.off("presence:update", handlePresence);
    };
  }, [refresh]);

  const users = userActivityStatus?.users || emptyList;
  const dailyLogins = userActivityStatus?.dailyLogins || emptyList;
  const summary = userActivityStatus?.summary || defaultSummary;

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch = !term || user.name?.toLowerCase().includes(term) || user.email?.toLowerCase().includes(term);
      const matchesFilter = filter === "all" || user.status === filter || user.role === filter;
      return matchesSearch && matchesFilter;
    });
  }, [filter, query, users]);

  const roleData = useMemo(() => ({
    labels: ["Admin", "Manager", "Staff"],
    datasets: [{ data: [summary.roles.admin, summary.roles.manager, summary.roles.staff], backgroundColor: ["#d71920", "#2455a6", "#64748b"], borderRadius: 6 }],
  }), [summary.roles.admin, summary.roles.manager, summary.roles.staff]);

  const presenceData = useMemo(() => ({
    labels: ["Online", "Idle", "Offline"],
    datasets: [{ data: [summary.online, summary.idle, summary.offline], backgroundColor: ["#10b981", "#f59e0b", "#ef4444"], borderWidth: 0 }],
  }), [summary.idle, summary.offline, summary.online]);

  const loginData = useMemo(() => ({
    labels: dailyLogins.map((item) => new Date(`${item.date}T00:00:00Z`).toLocaleDateString(undefined, { weekday: "short" })),
    datasets: [{ label: "Logins", data: dailyLogins.map((item) => item.count), borderColor: "#2455a6", backgroundColor: "rgba(36, 85, 166, 0.12)", fill: true, tension: 0.35 }],
  }), [dailyLogins]);

  const handleRemove = async (user) => {
    if (user._id === authUserId) {
      toast.error("You cannot delete your own active account.");
      return;
    }
    if (!window.confirm(`Delete ${user.name}'s account? This cannot be undone.`)) return;
    try {
      await dispatch(removeusers(user._id)).unwrap();
      toast.success("User deleted successfully.");
      refresh();
    } catch (error) {
      toast.error(error || "Unable to delete user.");
    }
  };

  const cards = useMemo(() => [
    { label: "Total Users", value: summary.total, icon: FiUsers, color: "text-slate-700 bg-slate-100" },
    { label: "Online Users", value: summary.online, icon: FiWifi, color: "text-emerald-700 bg-emerald-100" },
    { label: "Idle Users", value: summary.idle, icon: FiClock, color: "text-amber-700 bg-amber-100" },
    { label: "Offline Users", value: summary.offline, icon: FiWifiOff, color: "text-red-700 bg-red-100" },
  ], [summary.idle, summary.offline, summary.online, summary.total]);

  return (
    <section className="enterprise-page space-y-6">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>User Activity Monitor</h1>
          <span>Live presence, session history, and role distribution across HeroTrack Pro.</span>
        </div>
        <button className="sync-button flex items-center gap-2" onClick={refresh} disabled={isFetchingUserActivity}>
          <FiRefreshCw className={isFetchingUserActivity ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <article key={label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-semibold text-slate-500">{label}</p><strong className="mt-2 block text-3xl text-slate-900">{value}</strong></div>
              <span className={`grid h-11 w-11 place-items-center rounded-lg ${color}`}><Icon size={20} /></span>
            </div>
          </article>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <article className="h-72 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><Bar data={roleData} options={roleChartOptions} /></article>
        <article className="h-72 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><Doughnut data={presenceData} options={presenceChartOptions} /></article>
        <article className="h-72 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><Line data={loginData} options={loginChartOptions} /></article>
      </div>

      <div className="data-panel overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block w-full lg:max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="enterprise-search w-full pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or email" />
          </label>
          <div className="flex flex-wrap gap-2" aria-label="Filter users">
            {filterOptions.map((option) => (
              <button key={option} onClick={() => setFilter(option)} className={`rounded-md px-3 py-2 text-xs font-bold capitalize ring-1 transition ${filter === option ? "bg-[#2455a6] text-white ring-[#2455a6]" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"}`}>{option}</button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="enterprise-table min-w-full">
            <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Last Seen</th><th>Last Login</th><th>Total Active Time</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {filteredUsers.map((user) => {
                const meta = statusMeta[user.status] || statusMeta.offline;
                return (
                  <tr key={user._id}>
                    <td><div className="font-bold text-slate-900">{user.name}</div><div className="text-sm text-slate-500">{user.email}</div></td>
                    <td><span className="capitalize">{user.role}</span></td>
                    <td><span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ring-1 ${meta.badge}`}><span className={`h-2 w-2 rounded-full ${meta.dot}`} />{meta.label}</span></td>
                    <td title={formatDateTime(user.lastSeen)}>{formatRelative(user.lastSeen)}</td>
                    <td>{formatDateTime(user.lastLogin)}</td>
                    <td className="font-semibold">{formatActiveTime(user.totalActiveTime)}</td>
                    <td><button className="rounded-md p-2 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30" onClick={() => handleRemove(user)} disabled={user._id === authUserId} aria-label={`Delete ${user.name}`}><FiTrash2 /></button></td>
                  </tr>
                );
              })}
              {!filteredUsers.length && <tr><td colSpan="7" className="py-10 text-center text-slate-500">{isFetchingUserActivity ? "Loading activity..." : "No users match the current filters."}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default Userstatus;
