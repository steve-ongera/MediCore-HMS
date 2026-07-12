// src/pages/settings/AuditLog.jsx
import { Fragment, useEffect, useState } from "react";

import { getAuditLogs, getUsers } from "../../services/api";

const ACTION_OPTIONS = [
  { value: "CREATE", label: "Create" },
  { value: "UPDATE", label: "Update" },
  { value: "DELETE", label: "Delete" },
];

const ACTION_BADGE = {
  CREATE: "text-bg-success",
  UPDATE: "text-bg-warning",
  DELETE: "text-bg-danger",
};

const toArray = (data) => (Array.isArray(data) ? data : data?.results ?? []);

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const [search, setSearch] = useState("");
  const [modelName, setModelName] = useState("");
  const [action, setAction] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    getUsers().then((data) => setUsers(toArray(data))).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, modelName, action, userId]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await getAuditLogs({
        search: search || undefined,
        model_name: modelName || undefined,
        action: action || undefined,
        user: userId || undefined,
      });
      setLogs(toArray(data));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Model names are free-text on the backend, so the filter list is built
  // from whatever's actually appeared in results rather than a fixed enum.
  const knownModels = Array.from(new Set(logs.map((l) => l.model_name))).sort();

  function toggleExpand(id) {
    setExpandedId((current) => (current === id ? null : id));
  }

  return (
    <div className="page">
      <div className="page__header mb-3">
        <h4 className="mb-0">Audit Log</h4>
        <small className="text-muted">Record of who changed what, and when</small>
      </div>

      <div className="row g-2 mb-3">
        <div className="col-md-4">
          <input
            className="form-control"
            placeholder="Search by record ID or model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="col-md-3">
          <select className="form-select" value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">All actions</option>
            {ACTION_OPTIONS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>
        <div className="col-md-3">
          <select className="form-select" value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">All staff</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.full_name || u.username}</option>
            ))}
          </select>
        </div>
        <div className="col-md-2">
          <select className="form-select" value={modelName} onChange={(e) => setModelName(e.target.value)}>
            <option value="">All models</option>
            {knownModels.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Staff</th>
                <th>Action</th>
                <th>Model</th>
                <th>Record ID</th>
                <th>IP Address</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center text-muted py-4">Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-muted py-4">No audit entries found.</td></tr>
              ) : (
                logs.map((log) => (
                  <Fragment key={log.id}>
                    <tr
                      onClick={() => toggleExpand(log.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>{new Date(log.timestamp).toLocaleString()}</td>
                      <td>{log.user_name || "System"}</td>
                      <td><span className={`badge ${ACTION_BADGE[log.action] || "text-bg-light"}`}>{log.action}</span></td>
                      <td>{log.model_name}</td>
                      <td className="font-monospace small">{log.object_id}</td>
                      <td>{log.ip_address || "—"}</td>
                      <td className="text-end">
                        <i className={`bi ${expandedId === log.id ? "bi-chevron-up" : "bi-chevron-down"}`} />
                      </td>
                    </tr>
                    {expandedId === log.id && (
                      <tr>
                        <td colSpan={7} className="bg-light">
                          {Object.keys(log.changes || {}).length === 0 ? (
                            <span className="text-muted">No field-level changes recorded.</span>
                          ) : (
                            <table className="table table-sm mb-0">
                              <thead>
                                <tr>
                                  <th>Field</th>
                                  <th>Before</th>
                                  <th>After</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(log.changes).map(([field, value]) => (
                                  <tr key={field}>
                                    <td className="font-monospace">{field}</td>
                                    <td className="text-muted">
                                      {Array.isArray(value) ? String(value[0]) : "—"}
                                    </td>
                                    <td>
                                      {Array.isArray(value) ? String(value[1]) : String(value)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}