import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { BarVisual, DoughnutVisual, LineVisual } from "../lib/EnterpriseCharts";
import axiosInstance from "../lib/axios";

const movementTypes = [
  "warehouse_to_production",
  "production_to_qc",
  "qc_to_assembly",
  "maintenance_request",
  "return",
  "transfer",
  "stock_in",
  "stock_out",
  "adjustment",
];

const configs = {
  departments: {
    title: "Department Management",
    subtitle: "Plant departments and operating locations",
    endpoint: "departments",
    dataKey: "departments",
    columns: ["code", "name", "location", "head", "isActive"],
  },
  parts: {
    title: "Spare Parts Management",
    subtitle: "Hero MotoCorp part master and stock controls",
    endpoint: "spare-parts",
    dataKey: "parts",
    columns: ["partNumber", "partName", "manufacturer", "currentStock", "reorderLevel", "unitCost"],
  },
  movements: {
    title: "Inventory Movement Tracking",
    subtitle: "Warehouse, production, QC, assembly and maintenance movements",
    endpoint: "inventory-movements",
    dataKey: "movements",
    columns: ["transactionCode", "part", "fromDepartment", "toDepartment", "movementType", "quantity", "approvalStatus", "transactionDate"],
  },
  stock: {
    title: "Department Stock Ledger",
    subtitle: "Part availability by department, line, and plant location",
    endpoint: "inventory-movements/department-stock",
    dataKey: "stocks",
    columns: ["department", "part", "quantity", "lastUpdated"],
  },
  requests: {
    title: "Request Management",
    subtitle: "Department spare-part requests awaiting store review",
    endpoint: "inventory-movements/requests",
    createEndpoint: "inventory-movements/requests",
    dataKey: "approvals",
    columns: ["requestCode", "requestType", "department", "items", "status", "createdAt"],
  },
  approvals: {
    title: "Approval Workflow",
    subtitle: "Large quantity requests requiring manager approval",
    endpoint: "inventory-movements/approvals/pending",
    dataKey: "approvals",
    columns: ["requestCode", "department", "items", "movement", "status", "createdAt", "actions"],
  },
  reports: {
    title: "Analytics & Monthly Reports",
    subtitle: "Department performance, monthly usage and inventory intelligence",
    endpoint: "analytics/department-performance",
    dataKey: "data",
    columns: ["department", "parts", "quantity"],
  },
};

const resolveValue = (row, column) => {
  const value = row[column];
  if (column === "transactionDate" || column === "createdAt" || column === "lastUpdated") return value ? new Date(value).toLocaleString() : "-";
  if (column === "items") return row.items?.map((item) => `${item.part?.partName || item.part?.name || "Part"} x ${item.quantity}`).join(", ") || "-";
  if (column === "movement") return row.movement?.transactionCode || "-";
  if (typeof value === "boolean") return value ? "Active" : "Inactive";
  if (typeof value === "object" && value !== null) return value.name || value.partName || value.code || "-";
  return String(value ?? "-").replaceAll("_", " ");
};

const compactLabel = (label, fallback = "Item") => {
  const text = String(label || fallback);
  return text.length > 22 ? `${text.slice(0, 21)}...` : text;
};

const getRowKey = (row, index) =>
  row._id || row.requestCode || row.transactionCode || row.department?._id || row.department?.name || `row-${index}`;

const isLowStockPart = (part) =>
  Number(part.currentStock ?? part.quantity ?? 0) <= Number(part.reorderLevel || 10);

const getStockValue = (part) =>
  Number(part.currentStock ?? part.quantity ?? 0) * Number(part.unitCost ?? part.Price ?? 0);

const emptyReportData = {
  health: {},
  approvals: [],
  flow: [],
  monthly: [],
  trends: [],
  lowStock: [],
};

function EnterpriseTablePage({ type }) {
  const config = configs[type];
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { Authuser } = useSelector((state) => state.auth);
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [departments, setDepartments] = useState([]);
  const [parts, setParts] = useState([]);
  const [reportData, setReportData] = useState(emptyReportData);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({});
  const filterParam = searchParams.get("filter") || "";
  const sortParam = searchParams.get("sort") || "";
  const directionParam = searchParams.get("dir") || "asc";
  const statusParam = searchParams.get("status") || "";

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const requestParams = new URLSearchParams();
      if (type === "parts" && filterParam === "lowStock") requestParams.set("lowStock", "true");
      if (["movements", "requests"].includes(type) && statusParam) requestParams.set("status", statusParam);
      const endpoint = requestParams.toString() ? `${config.endpoint}?${requestParams.toString()}` : config.endpoint;
      const response = await axiosInstance.get(endpoint);
      setRows(response.data[config.dataKey] || []);
    } catch (error) {
      setRows([]);
      toast.error(error.response?.data?.message || "Unable to load records");
    } finally {
      setLoading(false);
    }
  }, [config.dataKey, config.endpoint, filterParam, statusParam, type]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setQuery("");
  }, [location.pathname, location.search, type]);

  useEffect(() => {
    const load = async () => {
      if (!["movements", "stock", "requests"].includes(type)) return;
      const [departmentRes, partRes] = await Promise.all([
        axiosInstance.get("departments"),
        axiosInstance.get("spare-parts"),
      ]);
      setDepartments(departmentRes.data.departments || []);
      setParts(partRes.data.parts || []);
    };
    load().catch(() => {});
  }, [type]);

  useEffect(() => {
    const loadReports = async () => {
      if (type !== "reports") return;
      const [healthRes, approvalRes, flowRes, monthlyRes, trendsRes, lowStockRes] = await Promise.all([
        axiosInstance.get("analytics/inventory-health"),
        axiosInstance.get("analytics/approval-metrics"),
        axiosInstance.get("analytics/movement-flow"),
        axiosInstance.get("analytics/monthly-usage"),
        axiosInstance.get("analytics/inventory-trends"),
        axiosInstance.get("analytics/low-stock-monitoring"),
      ]);
      setReportData({
        health: healthRes.data.data || {},
        approvals: approvalRes.data.data || [],
        flow: flowRes.data.data || [],
        monthly: monthlyRes.data.data || [],
        trends: trendsRes.data.data || [],
        lowStock: lowStockRes.data.parts || [],
      });
    };
    loadReports().catch(() => {});
  }, [type]);

  const displayedRows = useMemo(() => {
    let nextRows = [...rows];

    if (type === "parts" && filterParam === "lowStock") {
      nextRows = nextRows.filter(isLowStockPart);
    }

    if (statusParam) {
      nextRows = nextRows.filter((row) =>
        String(row.status ?? row.approvalStatus ?? "").toLowerCase() === statusParam.toLowerCase()
      );
    }

    if (type === "parts" && sortParam === "stockValue") {
      nextRows.sort((first, second) => {
        const difference = getStockValue(first) - getStockValue(second);
        return directionParam === "desc" ? -difference : difference;
      });
    }

    return nextRows;
  }, [directionParam, filterParam, rows, sortParam, statusParam, type]);

  const filteredRows = useMemo(
    () => displayedRows.filter((row) => JSON.stringify(row).toLowerCase().includes(query.toLowerCase())),
    [displayedRows, query]
  );

  const activeBadges = useMemo(() => {
    const badges = [];
    if (type === "parts" && filterParam === "lowStock") badges.push("Low stock filter active");
    if (type === "parts" && sortParam === "stockValue") badges.push(`Stock value ${directionParam}`);
    if (statusParam) badges.push(`${statusParam.replaceAll("_", " ")} records`);
    return badges;
  }, [directionParam, filterParam, sortParam, statusParam, type]);

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const canManageMasterData = ["admin", "manager"].includes(Authuser?.role);

  const submitRecord = async (event) => {
    event.preventDefault();
    const payload = { ...form };
    if (payload.quantity) payload.quantity = Number(payload.quantity);
    if (payload.currentStock) payload.currentStock = Number(payload.currentStock);
    if (payload.reorderLevel) payload.reorderLevel = Number(payload.reorderLevel);
    if (payload.unitCost) payload.unitCost = Number(payload.unitCost);
    if (type === "requests") {
      payload.items = [{ part: payload.part, quantity: Number(payload.quantity) }];
      delete payload.part;
      delete payload.quantity;
    }

    try {
      await axiosInstance.post(config.createEndpoint || config.endpoint, payload);
      toast.success("Record saved");
      setForm({});
      loadRows();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save record");
    }
  };

  const syncInventory = async () => {
    try {
      const response = await axiosInstance.post("inventory-movements/sync");
      toast.success(`Inventory synchronized (${response.data.synced || 0} parts)`);
      loadRows();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to synchronize inventory");
    }
  };

  const processApproval = async (approvalId, action) => {
    try {
      await axiosInstance.post(`inventory-movements/approvals/${approvalId}/${action}`, action === "reject" ? { rejectionReason: "Rejected from HeroTrack console" } : {});
      toast.success(`Request ${action === "approve" ? "approved" : "rejected"}`);
      loadRows();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to process approval");
    }
  };

  const renderForm = () => {
    if (["departments", "parts"].includes(type) && !canManageMasterData) return null;

    if (type === "departments") {
      return (
        <form className="enterprise-form" onSubmit={submitRecord}>
          <input value={form.code || ""} onChange={(event) => updateForm("code", event.target.value)} placeholder="Code" required />
          <input value={form.name || ""} onChange={(event) => updateForm("name", event.target.value)} placeholder="Department name" required />
          <input value={form.location || ""} onChange={(event) => updateForm("location", event.target.value)} placeholder="Location" />
          <button type="submit">Add Department</button>
        </form>
      );
    }

    if (type === "parts") {
      return (
        <form className="enterprise-form" onSubmit={submitRecord}>
          <input value={form.partNumber || ""} onChange={(event) => updateForm("partNumber", event.target.value)} placeholder="Part number" required />
          <input value={form.partName || ""} onChange={(event) => updateForm("partName", event.target.value)} placeholder="Part name" required />
          <input value={form.manufacturer || ""} onChange={(event) => updateForm("manufacturer", event.target.value)} placeholder="Manufacturer" />
          <input type="number" value={form.currentStock || ""} onChange={(event) => updateForm("currentStock", event.target.value)} placeholder="Stock" min="0" required />
          <input type="number" value={form.reorderLevel || ""} onChange={(event) => updateForm("reorderLevel", event.target.value)} placeholder="Reorder level" min="0" />
          <input type="number" value={form.unitCost || ""} onChange={(event) => updateForm("unitCost", event.target.value)} placeholder="Unit cost" min="0" />
          <button type="submit">Add Spare Part</button>
        </form>
      );
    }

    if (type === "movements") {
      return (
        <form className="enterprise-form movement-form" onSubmit={submitRecord}>
          <select value={form.part || ""} onChange={(event) => updateForm("part", event.target.value)} required>
            <option value="">Select part</option>
            {parts.map((part) => <option key={part._id} value={part._id}>{part.partNumber} - {part.partName || part.name}</option>)}
          </select>
          <select value={form.fromDepartment || ""} onChange={(event) => updateForm("fromDepartment", event.target.value)}>
            <option value="">From inventory</option>
            {departments.map((department) => <option key={department._id} value={department._id}>{department.name}</option>)}
          </select>
          <select value={form.toDepartment || ""} onChange={(event) => updateForm("toDepartment", event.target.value)}>
            <option value="">To inventory</option>
            {departments.map((department) => <option key={department._id} value={department._id}>{department.name}</option>)}
          </select>
          <select value={form.movementType || ""} onChange={(event) => updateForm("movementType", event.target.value)} required>
            <option value="">Movement type</option>
            {movementTypes.map((movementType) => <option key={movementType} value={movementType}>{movementType.replaceAll("_", " ")}</option>)}
          </select>
          <input type="number" value={form.quantity || ""} onChange={(event) => updateForm("quantity", event.target.value)} placeholder="Quantity" min="1" required />
          <input value={form.remarks || ""} onChange={(event) => updateForm("remarks", event.target.value)} placeholder="Remarks" />
          <button type="submit">Create Movement</button>
        </form>
      );
    }

    if (type === "requests") {
      return (
        <form className="enterprise-form movement-form" onSubmit={submitRecord}>
          <select value={form.department || ""} onChange={(event) => updateForm("department", event.target.value)} required>
            <option value="">Requesting department</option>
            {departments.map((department) => <option key={department._id} value={department._id}>{department.name}</option>)}
          </select>
          <select value={form.part || ""} onChange={(event) => updateForm("part", event.target.value)} required>
            <option value="">Requested part</option>
            {parts.map((part) => <option key={part._id} value={part._id}>{part.partNumber} - {part.partName || part.name}</option>)}
          </select>
          <input type="number" value={form.quantity || ""} onChange={(event) => updateForm("quantity", event.target.value)} placeholder="Quantity" min="1" required />
          <input value={form.remarks || ""} onChange={(event) => updateForm("remarks", event.target.value)} placeholder="Remarks" />
          <button type="submit">Submit Request</button>
        </form>
      );
    }

    return null;
  };

  const renderReports = () => {
    if (type !== "reports") return null;

    const approvalLabels = reportData.approvals.map((item) => String(item._id || "unknown").replaceAll("_", " "));
    const approvalValues = reportData.approvals.map((item) => Number(item.count || 0));
    const flowRows = reportData.flow.slice(0, 8);
    const flowLabels = flowRows.map((item) =>
      compactLabel(`${item._id?.from?.name || "Central"} to ${item._id?.to?.name || "Central"}`)
    );
    const flowValues = flowRows.map((item) => Number(item.quantity || 0));
    const monthlyRows = reportData.monthly.slice(-8);
    const monthlyLabels = monthlyRows.map((item) => `${item._id?.month || "-"} / ${item._id?.year || "-"}`);
    const monthlyValues = monthlyRows.map((item) => Number(item.totalQuantity || 0));
    const trendRows = reportData.trends.slice(-8);
    const trendLabels = trendRows.map((item) => compactLabel(String(item._id?.movementType || "movement").replaceAll("_", " ")));
    const trendValues = trendRows.map((item) => Number(item.quantity || 0));

    return (
      <div className="dashboard-grid report-grid">
        <div className="panel">
          <div className="panel-header">
            <h3>Inventory Health</h3>
            <span>Stock status</span>
          </div>
          <DoughnutVisual
            labels={["Healthy", "Low stock", "Out of stock"]}
            values={[
              Number(reportData.health.healthy || 0),
              Number(reportData.health.lowStock || 0),
              Number(reportData.health.outOfStock || 0),
            ]}
            label="Part health"
          />
          <div className="compact-list">
            <div><strong>{reportData.health.healthy || 0}</strong><span>Healthy parts</span></div>
            <div><strong>{reportData.health.lowStock || 0}</strong><span>Low stock parts</span></div>
            <div><strong>{reportData.health.outOfStock || 0}</strong><span>Out of stock parts</span></div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">
            <h3>Approval Workflow</h3>
            <span>Requests by status</span>
          </div>
          <BarVisual labels={approvalLabels} values={approvalValues} label="Requests" colors={["#f59e0b", "#16a34a", "#d71920"]} />
          <div className="compact-list">
            {reportData.approvals.map((item) => (
              <div key={item._id}><strong>{item.count}</strong><span>{String(item._id || "unknown").replaceAll("_", " ")}</span></div>
            ))}
            {reportData.approvals.length === 0 && <div className="empty-state">No approval metrics available.</div>}
          </div>
        </div>
        <div className="panel wide">
          <div className="panel-header">
            <h3>Movement Flow</h3>
            <span>Top routes</span>
          </div>
          <BarVisual labels={flowLabels} values={flowValues} label="Moved quantity" />
          <div className="compact-list">
            {flowRows.map((item) => (
              <div key={`${item._id?.from?._id || "warehouse"}-${item._id?.to?._id || "inventory"}-${item._id?.type}`}>
                <strong>{item.quantity} parts</strong>
                <span>{item._id?.from?.name || "Central Inventory"} to {item._id?.to?.name || "Central Inventory"} - {String(item._id?.type || "").replaceAll("_", " ")}</span>
              </div>
            ))}
            {flowRows.length === 0 && <div className="empty-state">No movement flow data available.</div>}
          </div>
        </div>
        <div className="panel wide">
          <div className="panel-header">
            <h3>Monthly Usage</h3>
            <span>Issued quantity</span>
          </div>
          <LineVisual labels={monthlyLabels} values={monthlyValues} label="Monthly usage" />
          <div className="bar-list">
            {monthlyRows.map((item) => {
              const label = `${item._id?.month || "-"} / ${item._id?.year || "-"}`;
              const max = Math.max(...monthlyValues, 1);
              const width = Math.round((Number(item.totalQuantity || 0) / max) * 100);
              return (
                <div className="bar-row" key={label}>
                  <span>{label}</span>
                  <div><i style={{ width: `${width}%` }} /></div>
                  <strong>{item.totalQuantity}</strong>
                </div>
              );
            })}
            {monthlyRows.length === 0 && <div className="empty-state">No monthly usage data available.</div>}
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">
            <h3>Low Stock Monitoring</h3>
            <span>{reportData.lowStock.length} parts</span>
          </div>
          <div className="compact-list">
            {reportData.lowStock.slice(0, 6).map((part) => (
              <div key={part._id}>
                <strong>{part.partNumber || "Part"}</strong>
                <span>{part.partName} needs {part.shortage} more</span>
                <em>{part.currentStock} / {part.reorderLevel}</em>
              </div>
            ))}
            {reportData.lowStock.length === 0 && <div className="empty-state">No low-stock parts found.</div>}
          </div>
        </div>
        <div className="panel wide">
          <div className="panel-header">
            <h3>Inventory Trends</h3>
            <span>Movement type totals</span>
          </div>
          <BarVisual labels={trendLabels} values={trendValues} label="Trend quantity" colors={["#17233c", "#2455a6", "#d71920"]} />
          <div className="compact-list">
            {trendRows.map((item) => (
              <div key={`${item._id?.year}-${item._id?.month}-${item._id?.movementType}`}>
                <strong>{item.quantity} parts</strong>
                <span>{String(item._id?.movementType || "movement").replaceAll("_", " ")} during {item._id?.month}/{item._id?.year}</span>
              </div>
            ))}
            {trendRows.length === 0 && <div className="empty-state">No movement trends available.</div>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="enterprise-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">HeroTrack Pro</p>
          <h1>{config.title}</h1>
          <span>{config.subtitle}</span>
        </div>
        <div className="heading-actions">
          {type === "stock" && canManageMasterData && <button className="sync-button" onClick={syncInventory}>Sync Inventory</button>}
          {activeBadges.map((badge) => <span className="status-pill amber" key={badge}>{badge}</span>)}
          <input className="enterprise-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search records" />
        </div>
      </div>

      {renderForm()}
      {renderReports()}

      <div className="data-panel">
        <table className="enterprise-table">
          <thead>
            <tr>
              {config.columns.map((column) => <th key={column}>{column.replace(/([A-Z])/g, " $1")}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={config.columns.length}>Loading records...</td>
              </tr>
            )}
            {!loading && filteredRows.length === 0 && (
              <tr>
                <td colSpan={config.columns.length}>No records found.</td>
              </tr>
            )}
            {filteredRows.map((row, index) => (
              <tr key={getRowKey(row, index)}>
                {config.columns.map((column) => (
                  <td key={column}>
                    {column === "actions" ? (
                      <div className="table-actions">
                        <button onClick={() => processApproval(row._id, "approve")}>Approve</button>
                        <button className="danger" onClick={() => processApproval(row._id, "reject")}>Reject</button>
                      </div>
                    ) : (
                      <span className={column === "approvalStatus" || column === "status" ? `status-badge ${resolveValue(row, column)}` : ""}>
                        {resolveValue(row, column)}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default EnterpriseTablePage;
