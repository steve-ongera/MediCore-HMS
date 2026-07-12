import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getUsers, createUser, updateUser, deleteUser, getDepartments } from "../../services/api";
import DataTable from "../../components/DataTable";
import SearchBar from "../../components/SearchBar";
import Pagination from "../../components/Pagination";
import StatusBadge from "../../components/StatusBadge";
import ConfirmDialog from "../../components/ConfirmDialog";
import { formatDate } from "../../utils/formatters";

const ROLE_OPTIONS = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "RECEPTIONIST", label: "Receptionist" },
  { value: "CASHIER", label: "Cashier" },
  { value: "NURSE", label: "Nurse" },
  { value: "DOCTOR", label: "Doctor" },
  { value: "LAB_TECHNOLOGIST", label: "Laboratory Technologist" },
  { value: "RADIOLOGIST", label: "Radiologist" },
  { value: "PHARMACIST", label: "Pharmacist" },
  { value: "ACCOUNTANT", label: "Accountant" },
];

const roleLabel = (value) => ROLE_OPTIONS.find((r) => r.value === value)?.label || value;

const EMPTY_FORM = {
  username: "",
  email: "",
  first_name: "",
  last_name: "",
  role: "RECEPTIONIST",
  phone: "",
  department: "",
  password: "",
};

const toArray = (data) => (Array.isArray(data) ? data : data?.results ?? []);

export default function Users() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [pendingAction, setPendingAction] = useState(null); // { type: "delete"|"toggle", user }

  const pageSize = 20;

  useEffect(() => {
    getDepartments().then((data) => setDepartments(toArray(data))).catch(() => {});
  }, []);

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, roleFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const data = await getUsers(params);
      setUsers(data.results || toArray(data));
      setTotal(data.count ?? toArray(data).length);
    } catch (err) {
      toast.error(err.message || "Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  };

  const openEditForm = (user) => {
    setEditingId(user.id);
    setForm({
      username: user.username,
      email: user.email || "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      role: user.role,
      phone: user.phone || "",
      department: user.department || "",
      password: "",
    });
    setFormError("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      if (editingId) {
        const { password, ...payload } = form;
        await updateUser(editingId, payload);
        toast.success("Staff member updated");
      } else {
        await createUser(form);
        toast.success("Staff member added");
      }
      closeForm();
      loadUsers();
    } catch (err) {
      setFormError(err.message || "Failed to save staff member");
    } finally {
      setSaving(false);
    }
  };

  const requestToggleActive = (user) => setPendingAction({ type: "toggle", user });
  const requestDelete = (user) => setPendingAction({ type: "delete", user });

  const confirmPendingAction = async () => {
    if (!pendingAction) return;
    const { type, user } = pendingAction;
    try {
      if (type === "toggle") {
        await updateUser(user.id, { is_active_staff: !user.is_active_staff });
        toast.success(user.is_active_staff ? "Staff member deactivated" : "Staff member reactivated");
      } else {
        await deleteUser(user.id);
        toast.success("Staff member deleted");
      }
      loadUsers();
    } catch (err) {
      toast.error(err.message || "Action failed");
    } finally {
      setPendingAction(null);
    }
  };

  const columns = [
    {
      key: "full_name",
      label: "Name",
      render: (row) => (
        <div className="table-row-avatar">
          <span className="avatar avatar-sm">
            {(row.full_name || row.username)?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
          </span>
          <div>
            <div className="cell-primary">{row.full_name || `${row.first_name} ${row.last_name}`.trim() || row.username}</div>
            <div className="text-2xs text-tertiary">{row.email || "—"}</div>
          </div>
        </div>
      ),
    },
    {
      key: "username",
      label: "Username",
      render: (row) => <span className="cell-mono">{row.username}</span>,
    },
    {
      key: "role",
      label: "Role",
      render: (row) => <StatusBadge status={roleLabel(row.role)} variant="neutral" />,
    },
    {
      key: "department",
      label: "Department",
      render: (row) => departments.find((d) => d.id === row.department)?.name || "—",
    },
    {
      key: "phone",
      label: "Phone",
      render: (row) => row.phone || "—",
    },
    {
      key: "date_joined",
      label: "Joined",
      render: (row) => (row.date_joined ? formatDate(row.date_joined) : "—"),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <button
          className="btn-icon-only-labeled"
          onClick={() => requestToggleActive(row)}
          title={row.is_active_staff ? "Deactivate" : "Reactivate"}
        >
          <StatusBadge
            status={row.is_active_staff ? "Active" : "Deactivated"}
            variant={row.is_active_staff ? "success" : "secondary"}
          />
        </button>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex gap-1 justify-end">
          <button className="btn-icon-only" onClick={() => openEditForm(row)} title="Edit staff member">
            <i className="bi bi-pencil"></i>
          </button>
          <button
            className="btn-icon-only"
            style={{ color: "var(--danger-strong)" }}
            onClick={() => requestDelete(row)}
            title="Delete staff member"
          >
            <i className="bi bi-trash"></i>
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
          <h1 className="page-title">Staff</h1>
          <p className="page-subtitle">Manage staff accounts, roles, and access</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-primary" onClick={openCreateForm}>
            <i className="bi bi-person-plus me-2"></i>
            Add Staff
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <SearchBar
              placeholder="Search by name, username, email, or phone..."
              onSearch={(val) => {
                setSearch(val);
                setPage(1);
              }}
              delay={400}
            />
            <select
              className="form-select form-select-sm"
              style={{ maxWidth: 220 }}
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All roles</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {total} staff member{total !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="card-body p-0">
          <DataTable
            columns={columns}
            data={users}
            loading={loading}
            emptyMessage="No staff found. Add a staff member to get started."
          />
        </div>

        <div className="card-footer">
          <Pagination page={page} count={total} pageSize={pageSize} onPageChange={setPage} />
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <form className="modal-panel" onSubmit={handleSubmit}>
            <div className="modal-panel__header">
              <h2 className="modal-panel__title">{editingId ? "Edit Staff Member" : "Add Staff Member"}</h2>
              <button type="button" className="btn-icon-only" onClick={closeForm}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="modal-panel__body">
              {formError && <div className="alert alert-danger">{formError}</div>}

              <div className="form-grid form-grid-2">
                <div className="form-field">
                  <label className="form-label">First name</label>
                  <input
                    className="form-control"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Last name</label>
                  <input
                    className="form-control"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">Username</label>
                <input
                  className="form-control"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  disabled={!!editingId}
                  required
                />
              </div>

              <div className="form-field">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="form-grid form-grid-2">
                <div className="form-field">
                  <label className="form-label">Role</label>
                  <select
                    className="form-select"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Department</label>
                  <select
                    className="form-select"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                  >
                    <option value="">None</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">Phone</label>
                <input
                  className="form-control"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              {!editingId && (
                <div className="form-field">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                  />
                </div>
              )}
            </div>

            <div className="modal-panel__footer">
              <button type="button" className="btn btn-outline" onClick={closeForm}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        show={!!pendingAction}
        onClose={() => setPendingAction(null)}
        onConfirm={confirmPendingAction}
        title={pendingAction?.type === "delete" ? "Delete Staff Member" : "Change Staff Status"}
        message={
          pendingAction?.type === "delete"
            ? "Are you sure you want to delete this staff member? This action cannot be undone."
            : `Are you sure you want to ${pendingAction?.user?.is_active_staff ? "deactivate" : "reactivate"} this staff member?`
        }
        variant={pendingAction?.type === "delete" ? "danger" : "warning"}
      />
    </>
  );
}