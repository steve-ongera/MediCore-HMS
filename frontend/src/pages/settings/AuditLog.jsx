import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getAuditLogs, getUsers } from "../../services/api";
import DataTable from "../../components/DataTable";
import SearchBar from "../../components/SearchBar";
import Pagination from "../../components/Pagination";
import StatusBadge from "../../components/StatusBadge";
import { formatDateTime } from "../../utils/formatters";

const ACTION_OPTIONS = [
  { value: "CREATE", label: "Create" },
  { value: "UPDATE", label: "Update" },
  { value: "DELETE", label: "Delete" },
];

const ACTION_VARIANT = {
  CREATE: "success",
  UPDATE: "warning",
  DELETE: "danger",
};

const toArray = (data) => (Array.isArray(data) ? data : data?.results ?? []);

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [userId, setUserId] = useState("");
  const [viewingLog, setViewingLog] = useState(null);

  const pageSize = 25;

  useEffect(() => {
    getUsers().then((data) => setUsers(toArray(data))).catch(() => {});
  }, []);

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, action, userId]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize };
      if (search) params.search = search;
      if (action) params.action = action;
      if (userId) params.user = userId;
      const data = await getAuditLogs(params);
      setLogs(data.results || toArray(data));
      setTotal(data.count ?? toArray(data).length);
    } catch (err) {
      toast.error(err.message || "Failed to load audit log");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: "timestamp",
      label: "Timestamp",
      render: (row) => formatDateTime(row.timestamp),
    },
    {
      key: "user_name",
      label: "Staff",
      render: (row) => row.user_name || "System",
    },
    {
      key: "action",
      label: "Action",
      render: (row) => <StatusBadge status={row.action} variant={ACTION_VARIANT[row.action] || "neutral"} />,
    },
    {
      key: "model_name",
      label: "Model",
      render: (row) => row.model_name,
    },
    {
      key: "object_id",
      label: "Record ID",
      render: (row) => <span className="cell-mono text-2xs">{row.object_id}</span>,
    },
    {
      key: "ip_address",
      label: "IP Address",
      render: (row) => row.ip_address || "—",
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex gap-1 justify-end">
          <button className="btn-icon-only" onClick={() => setViewingLog(row)} title="View changes">
            <i className="bi bi-eye"></i>
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Settings</div>
          <h1 className="page-title">Audit Log</h1>
          <p className="page-subtitle">Record of who changed what, and when</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <SearchBar
              placeholder="Search by record ID or model..."
              onSearch={(val) => {
                setSearch(val);
                setPage(1);
              }}
              delay={400}
            />
            <select
              className="form-select form-select-sm"
              style={{ maxWidth: 180 }}
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All actions</option>
              {ACTION_OPTIONS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
            <select
              className="form-select form-select-sm"
              style={{ maxWidth: 220 }}
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All staff</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name || u.username}</option>
              ))}
            </select>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {total} entr{total !== 1 ? "ies" : "y"}
            </span>
          </div>
        </div>

        <div className="card-body p-0">
          <DataTable
            columns={columns}
            data={logs}
            loading={loading}
            emptyMessage="No audit entries found."
          />
        </div>

        <div className="card-footer">
          <Pagination page={page} count={total} pageSize={pageSize} onPageChange={setPage} />
        </div>
      </div>

      {viewingLog && (
        <div className="modal-overlay">
          <div className="modal-panel">
            <div className="modal-panel__header">
              <h2 className="modal-panel__title">
                {viewingLog.action} — {viewingLog.model_name}
              </h2>
              <button type="button" className="btn-icon-only" onClick={() => setViewingLog(null)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="modal-panel__body">
              <p className="text-tertiary text-sm">
                {viewingLog.user_name || "System"} &middot; {formatDateTime(viewingLog.timestamp)}
              </p>

              {Object.keys(viewingLog.changes || {}).length === 0 ? (
                <p className="text-tertiary">No field-level changes recorded.</p>
              ) : (
                <table className="table-simple">
                  <thead>
                    <tr>
                      <th>Field</th>
                      <th>Before</th>
                      <th>After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(viewingLog.changes).map(([field, value]) => (
                      <tr key={field}>
                        <td className="cell-mono">{field}</td>
                        <td className="text-tertiary">{Array.isArray(value) ? String(value[0]) : "—"}</td>
                        <td>{Array.isArray(value) ? String(value[1]) : String(value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="modal-panel__footer">
              <button type="button" className="btn btn-outline" onClick={() => setViewingLog(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}