import { useDispatch, useSelector } from "react-redux";
import { useEffect, useMemo, useState } from "react";
import { activityLogReceived, getAllActivityLogs } from "../features/activitySlice";
import FormattedTime from "../lib/FormattedTime ";
import socket from "../lib/socket";

function Activitylogpage() {
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

  const { activityLogs } = useSelector((state) => state.activity);
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

  const totalPages = Math.max(1, Math.ceil(activityLogs.length / logsPerPage));
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = useMemo(
    () => activityLogs.slice(indexOfFirstLog, indexOfLastLog),
    [activityLogs, indexOfFirstLog, indexOfLastLog]
  );

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  return (
    <section className="enterprise-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Governance</p>
          <h1>Activity Logs</h1>
          <span>Audit trail for users, stock actions, approvals and operational changes.</span>
        </div>
        <span className="status-pill">{activityLogs.length} events</span>
      </div>

      <div className="data-panel">
        <table className="enterprise-table">
          <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Action</th>
                <th>Module</th>
                <th>Description</th>
                <th>Session</th>
                <th>Time</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {currentLogs.length > 0 ? (
                currentLogs.map((log, index) => (
                  <tr key={log._id || `${log.action}-${index}`}>
                    <td>{indexOfFirstLog + index + 1}</td>
                    <td>{log.userId?.name || "System"}</td>
                    <td>{log.userId?.email || "-"}</td>
                    <td>{log.action || "-"}</td>
                    <td className="capitalize">{(log.module || log.entity || "-").replaceAll("_", " ")}</td>
                    <td>{log.description || "-"}</td>
                    <td>{log.duration ? `${Number(log.duration).toFixed(2)} min` : "-"}</td>
                    <td>
                      <FormattedTime timestamp={log.createdAt} />
                    </td>
                    <td>{log.ipAddress || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="text-center py-4">
                    <p>No activity logs available</p>
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
          >
            Prev
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
          >
            Next
          </button>
        </div>
        )}
    </section>
  );
}

export default Activitylogpage;
