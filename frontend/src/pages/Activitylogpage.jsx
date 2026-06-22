import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { getAllActivityLogs, getsingleUserActivityLogs } from "../features/activitySlice";
import FormattedTime from "../lib/FormattedTime ";
import socket from "../lib/socket";

function Activitylogpage() {
  const [logs, setLogs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

  const { activityLogs } = useSelector((state) => state.activity);
  const { Authuser } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  useEffect(() => {
    if (Authuser?.id) {
      dispatch(getAllActivityLogs());
      dispatch(getsingleUserActivityLogs(Authuser.id));
    }

    const handleActivityLog = (newLog) => {
      setLogs((prevLogs) => [newLog, ...prevLogs]);
    };

    socket.on("newActivityLog", handleActivityLog);

    return () => {
      socket.off("newActivityLog", handleActivityLog);
    };
  }, [dispatch, Authuser?.id]);

  useEffect(() => {
    setLogs(Array.isArray(activityLogs) ? activityLogs : []);
  }, [activityLogs]);

  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = logs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(logs.length / logsPerPage);

  return (
    <section className="enterprise-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Governance</p>
          <h1>Activity Logs</h1>
          <span>Audit trail for users, stock actions, approvals and operational changes.</span>
        </div>
        <span className="status-pill">{logs.length} events</span>
      </div>

      <div className="data-panel">
        <table className="enterprise-table">
          <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Action</th>
                <th>Affected Part</th>
                <th>Description</th>
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
                    <td>{log.entity || "-"}</td>
                    <td>{log.description || "-"}</td>
                    <td>
                      <FormattedTime timestamp={log.createdAt} />
                    </td>
                    <td>{log.ipAddress || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-4">
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
