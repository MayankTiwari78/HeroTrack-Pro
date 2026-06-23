import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FiAlertTriangle, FiBarChart2, FiBell, FiBox, FiCheckSquare } from "react-icons/fi";
import heroMotoCorpLogo from "../assets/heromotocorp-logo.png";
import { BarVisual, DoughnutVisual, LineVisual } from "../lib/EnterpriseCharts";
import axiosInstance from "../lib/axios";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

const plantFlow = ["Stores", "Production", "Quality", "Assembly", "Dispatch"];
const activeMovementStatuses = ["not_required", "approved"];
const stageRules = {
  Stores: {
    aliases: ["store", "stores", "warehouse", "wh", "central inventory", "inventory"],
    movementTypes: ["stock_in", "warehouse_to_production", "return", "transfer", "adjustment"],
  },
  Production: {
    aliases: ["production", "prod"],
    movementTypes: ["warehouse_to_production", "production_to_qc"],
  },
  Quality: {
    aliases: ["quality", "quality control", "qc"],
    movementTypes: ["production_to_qc", "qc_to_assembly"],
  },
  Assembly: {
    aliases: ["assembly", "asm"],
    movementTypes: ["qc_to_assembly"],
  },
  Dispatch: {
    aliases: ["dispatch", "dsp"],
    movementTypes: ["stock_out"],
  },
};

const normalizeText = (value) => String(value || "").toLowerCase();
const getPartId = (part) => String(part?._id || part || "");
const getStockQuantity = (part) => Number(part?.currentStock ?? part?.quantity ?? 0);
const getStockValue = (part) => getStockQuantity(part) * Number(part?.unitCost ?? part?.Price ?? 0);
const isLowStockPart = (part) => getStockQuantity(part) <= Number(part?.reorderLevel || 10);

const departmentMatchesStage = (department, stage) => {
  if (!stage) return true;
  const rules = stageRules[stage];
  const haystack = normalizeText(`${department?.name || ""} ${department?.code || ""}`);
  return rules.aliases.some((alias) => haystack.includes(alias));
};

const movementMatchesStage = (movement, stage) => {
  if (!stage) return true;
  const rules = stageRules[stage];
  return (
    rules.movementTypes.includes(movement.movementType) ||
    departmentMatchesStage(movement.fromDepartment, stage) ||
    departmentMatchesStage(movement.toDepartment, stage)
  );
};

function HeroTrackDashboard() {
  const navigate = useNavigate();
  const { Authuser } = useSelector((state) => state.auth);
  const [summary, setSummary] = useState({});
  const [parts, setParts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [departmentStocks, setDepartmentStocks] = useState([]);
  const [departmentConsumption, setDepartmentConsumption] = useState([]);
  const [mostUsed, setMostUsed] = useState([]);
  const [approvalMetrics, setApprovalMetrics] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeStage, setActiveStage] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const canViewAnalytics = ["admin", "manager"].includes(Authuser?.role);

        if (canViewAnalytics) {
          const summaryRes = await axiosInstance.get("analytics/summary");
setSummary(summaryRes.data.summary || {});

const results = await Promise.allSettled([
  axiosInstance.get("spare-parts"),
  axiosInstance.get("inventory-movements?limit=200"),
  axiosInstance.get("inventory-movements/department-stock"),
  axiosInstance.get("analytics/department-consumption"),
  axiosInstance.get("analytics/most-used-parts"),
  axiosInstance.get("analytics/approval-metrics"),
  axiosInstance.get("notification/allNotification"),
]);

const [
  partsRes,
  movementsRes,
  stockRes,
  consumptionRes,
  mostUsedRes,
  approvalsRes,
  notificationsRes,
] = results.map((r) => (r.status === "fulfilled" ? r.value : { data: {} }));

setParts(partsRes.data.parts || []);
setMovements(movementsRes.data.movements || []);
setDepartmentStocks(stockRes.data.stocks || []);
setDepartmentConsumption(consumptionRes.data.data || []);
setMostUsed(mostUsedRes.data.data || []);
setApprovalMetrics(approvalsRes.data.data || []);
setNotifications(Array.isArray(notificationsRes.data) ? notificationsRes.data : []);
          return;
        }

        const [partsRes, movementsRes, stockRes, notificationsRes] = await Promise.all([
          axiosInstance.get("spare-parts"),
          axiosInstance.get("inventory-movements?limit=200"),
          axiosInstance.get("inventory-movements/department-stock"),
          axiosInstance.get("notification/allNotification"),
        ]);
        const allParts = partsRes.data.parts || [];
        const lowStockParts = allParts.filter(isLowStockPart);
        const recentMovements = movementsRes.data.movements || [];
        setSummary({
          totalSpareParts: partsRes.data.total || allParts.length,
          totalStockValue: allParts.reduce((total, part) => total + getStockValue(part), 0),
          lowStockParts: lowStockParts.length,
          pendingApprovals: 0,
          totalMovements: recentMovements.length,
        });
        setParts(allParts);
        setMovements(recentMovements);
        setDepartmentStocks(stockRes.data.stocks || []);
        setDepartmentConsumption([]);
        setMostUsed([]);
        setApprovalMetrics([]);
        setNotifications(Array.isArray(notificationsRes.data) ? notificationsRes.data : []);
      } catch (error) {
        setLoadError("Live analytics are unavailable. Check the API connection and MongoDB deployment variables.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [Authuser?.role]);

  const cards = useMemo(
    () => [
      { label: "Total Spare Parts", value: summary.totalSpareParts || 0, tone: "red", icon: FiBox, to: "spare-parts" },
      {
        label: "Total Stock Value",
        value: formatCurrency(summary.totalStockValue),
        tone: "blue",
        icon: FiBarChart2,
        to: "spare-parts?sort=stockValue&dir=desc",
      },
      { label: "Low Stock Parts", value: summary.lowStockParts || 0, tone: "amber", icon: FiAlertTriangle, to: "spare-parts?filter=lowStock" },
      { label: "Pending Approvals", value: summary.pendingApprovals || 0, tone: "green", icon: FiCheckSquare, to: "approvals?status=pending" },
    ],
    [summary]
  );

  const lowStockParts = useMemo(() => parts.filter(isLowStockPart), [parts]);
  const filteredMovements = useMemo(
    () => movements.filter((movement) => movementMatchesStage(movement, activeStage)),
    [activeStage, movements]
  );
  const visibleMovements = useMemo(() => filteredMovements.slice(0, 8), [filteredMovements]);
  const filteredDepartmentStocks = useMemo(
    () => departmentStocks.filter((stock) => departmentMatchesStage(stock.department, activeStage)),
    [activeStage, departmentStocks]
  );
  const filteredStagePartIds = useMemo(() => {
    if (!activeStage) return null;
    const partIds = new Set();
    filteredDepartmentStocks.forEach((stock) => partIds.add(getPartId(stock.part)));
    filteredMovements.forEach((movement) => partIds.add(getPartId(movement.part)));
    return partIds;
  }, [activeStage, filteredDepartmentStocks, filteredMovements]);
  const visibleLowStockParts = useMemo(() => {
    if (!filteredStagePartIds) return lowStockParts;
    return lowStockParts.filter((part) => filteredStagePartIds.has(getPartId(part)));
  }, [filteredStagePartIds, lowStockParts]);
  const stageStockHealth = useMemo(() => {
    if (!activeStage) return null;
    return filteredDepartmentStocks.reduce(
      (totals, stock) => {
        const quantity = Number(stock.quantity || 0);
        const reorderLevel = Number(stock.part?.reorderLevel || 10);
        if (quantity <= reorderLevel) totals.lowStock += 1;
        else totals.healthy += 1;
        return totals;
      },
      { healthy: 0, lowStock: 0 }
    );
  }, [activeStage, filteredDepartmentStocks]);
  const consumptionRows = useMemo(
    () => departmentConsumption.filter((item) => departmentMatchesStage(item._id, activeStage)).slice(0, 7),
    [activeStage, departmentConsumption]
  );
  const consumptionMax = useMemo(
    () => Math.max(...consumptionRows.map((item) => Number(item.totalQuantity || 0)), 1),
    [consumptionRows]
  );
  const consumptionLabels = consumptionRows.map((item) => item._id?.name || "Unassigned");
  const consumptionValues = consumptionRows.map((item) => Number(item.totalQuantity || 0));
  const mostUsedRows = useMemo(() => {
    if (!activeStage) return mostUsed.slice(0, 6);
    const byPart = filteredMovements
      .filter((movement) => activeMovementStatuses.includes(movement.approvalStatus))
      .reduce((totals, movement) => {
        const partId = getPartId(movement.part);
        if (!partId) return totals;
        totals[partId] = totals[partId] || { _id: movement.part, totalQuantity: 0 };
        totals[partId].totalQuantity += Number(movement.quantity || 0);
        return totals;
      }, {});
    return Object.values(byPart)
      .sort((first, second) => second.totalQuantity - first.totalQuantity)
      .slice(0, 6);
  }, [activeStage, filteredMovements, mostUsed]);
  const movementTrend = [...visibleMovements].reverse();
  const lowStockCount = stageStockHealth ? stageStockHealth.lowStock : Number(summary.lowStockParts || 0);
  const healthyParts = stageStockHealth
    ? stageStockHealth.healthy
    : Math.max(Number(summary.totalSpareParts || 0) - Number(summary.lowStockParts || 0), 0);
  const approvalLabels = approvalMetrics.map((item) => String(item._id || "unknown").replaceAll("_", " "));
  const approvalValues = approvalMetrics.map((item) => Number(item.count || 0));

  return (
    <section className="enterprise-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Command Center</p>
          <h1>HeroTrack Pro Operations Dashboard</h1>
          <span>Live spare-part visibility across departments, approvals and plant movement flow.</span>
        </div>
        <div className="heading-stack">
          <span className="status-pill">Enterprise Control View</span>
          <span className={`data-health ${loadError ? "warning" : ""}`}>{loadError ? "API attention needed" : "Analytics online"}</span>
        </div>
      </div>

      {loadError && <div className="alert-strip">{loadError}</div>}

      <div className="plant-flow-strip">
        <div className="flow-head">
          <span className="flow-logo-mark">
            <img src={heroMotoCorpLogo} alt="Hero MotoCorp" />
          </span>
          <div>
            <strong>Hero MotoCorp Operations Flow</strong>
            <span>Spare-part flow from stores to dispatch</span>
          </div>
        </div>
        <div className="flow-line">
          {plantFlow.map((station, index) => (
            <button
              className={`flow-node ${activeStage === station ? "active" : ""}`}
              key={station}
              type="button"
              onClick={() => setActiveStage(station)}
              aria-pressed={activeStage === station}
            >
              <i>{index + 1}</i>
              <span>{station}</span>
            </button>
          ))}
        </div>
        <div className="flow-metric">
          <strong>{loading ? "..." : visibleMovements.length}</strong>
          <span>recent movements</span>
        </div>
      </div>

      <div className="metric-grid">
        {cards.map((card) => (
          <button className={`metric-card ${card.tone}`} key={card.label} type="button" onClick={() => navigate(card.to)}>
            <div className="metric-card-head">
              <span>{card.label}</span>
              <card.icon />
            </div>
            <strong>{loading ? "..." : card.value}</strong>
            <p>Updated from the HeroTrack spare-parts ledger</p>
          </button>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="panel wide">
          <div className="panel-header">
            <h3>Department Overview</h3>
            <span>Quantity issued</span>
          </div>
          <BarVisual labels={consumptionLabels} values={consumptionValues} label="Issued quantity" />
          <div className="bar-list">
            {consumptionRows.map((item) => {
              const label = item._id?.name || "Unassigned";
              const width = Math.round((Number(item.totalQuantity || 0) / consumptionMax) * 100);
              return (
                <div className="bar-row" key={label}>
                  <span>{label}</span>
                  <div><i style={{ width: `${width}%` }} /></div>
                  <strong>{item.totalQuantity}</strong>
                </div>
              );
            })}
            {!loading && consumptionRows.length === 0 && <div className="empty-state">No department consumption data yet.</div>}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Inventory Overview</h3>
            <span>Current health</span>
          </div>
          <DoughnutVisual
            labels={["Healthy", "Low stock"]}
            values={[healthyParts, lowStockCount]}
            label="Part health"
          />
          <div className="panel-note">
            <strong>{visibleLowStockParts.length}</strong>
            <span>parts need replenishment review</span>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Approval Overview</h3>
            <span>Workflow status</span>
          </div>
          <DoughnutVisual labels={approvalLabels} values={approvalValues} label="Approval requests" />
          <div className="compact-list">
            {approvalMetrics.map((item) => (
              <div key={item._id || "unknown"}>
                <strong>{item.count}</strong>
                <span>{String(item._id || "unknown").replaceAll("_", " ")}</span>
              </div>
            ))}
            {!loading && approvalMetrics.length === 0 && <div className="empty-state">No approval workflow data available.</div>}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Most Used Parts</h3>
            <span>Top consumption</span>
          </div>
          <BarVisual
            labels={mostUsedRows.map((item) => item._id?.partNumber || item._id?.partName || "Part")}
            values={mostUsedRows.map((item) => Number(item.totalQuantity || 0))}
            label="Used quantity"
            colors={["#2455a6", "#16a34a", "#d71920"]}
          />
          <div className="compact-list">
            {mostUsedRows.slice(0, 4).map((item) => (
              <div key={item._id?._id || item._id}>
                <strong>{item._id?.partNumber || "Part"}</strong>
                <span>{item._id?.partName || item._id?.name}</span>
                <em>{item.totalQuantity}</em>
              </div>
            ))}
            {!loading && mostUsedRows.length === 0 && <div className="empty-state">No usage ranking available.</div>}
          </div>
        </div>

        <div className="panel wide">
          <div className="panel-header">
            <h3>Inventory Movement Timeline</h3>
            <span>Recent transactions</span>
          </div>
          <LineVisual
            labels={movementTrend.map((movement) => movement.transactionCode || "Movement")}
            values={movementTrend.map((movement) => Number(movement.quantity || 0))}
            label="Moved quantity"
          />
          <div className="timeline">
            {visibleMovements.map((movement) => (
              <div key={movement._id}>
                <b>{movement.transactionCode}</b>
                <span>{movement.part?.partName || movement.part?.name} moved to {movement.toDepartment?.name || "inventory"}</span>
                <em>{movement.approvalStatus.replace("_", " ")}</em>
              </div>
            ))}
            {!loading && visibleMovements.length === 0 && <div className="empty-state">No recent movements found.</div>}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Low Stock Watchlist</h3>
            <span>{visibleLowStockParts.length} critical</span>
          </div>
          <div className="compact-list">
            {visibleLowStockParts.slice(0, 6).map((part) => (
              <div key={part._id}>
                <strong>{part.partNumber || "N/A"}</strong>
                <span>{part.partName || part.name}</span>
                <em>{part.currentStock ?? part.quantity} left</em>
              </div>
            ))}
            {!loading && visibleLowStockParts.length === 0 && <div className="empty-state">No low-stock parts reported.</div>}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Notification Center</h3>
            <span>{notifications.length} alerts</span>
          </div>
          <div className="notification-stack">
            {notifications.slice(0, 5).map((notification) => (
              <div key={notification._id || notification.createdAt || notification.name} className="notification-item">
                <FiBell />
                <div>
                  <strong>{notification.name}</strong>
                  <span>{notification.type || "system"}</span>
                </div>
              </div>
            ))}
            {!loading && notifications.length === 0 && <div className="empty-state">No notifications available.</div>}
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroTrackDashboard;
