// src/pages/settings/Users.jsx
import { useEffect, useState } from "react";

import { getUsers, createUser, updateUser, deleteUser, getDepartments } from "../../services/api";

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

// DRF paginated responses come back as { count, next, previous, results }.
// This project has hit that bug repeatedly, so normalize defensively here.
const toArray = (data) => (Array.isArray(data) ? data : data?.results ?? []);

export default function Users() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleFilter]);

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const data = await getUsers({ search: search || undefined, role: roleFilter || undefined });
      setUsers(toArray(data));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadDepartments() {
    try {
      const data = await getDepartments();
      setDepartments(toArray(data));
    } catch {
      // Non-fatal — the department select just stays empty.
    }
  }

  function openCreateForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(user) {
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
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setFormError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      if (editingId) {
        const { password, ...payload } = form; // password isn't editable inline
        await updateUser(editingId, payload);
      } else {
        await createUser(form);
      }
      closeForm();
      loadUsers();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(user) {
    try {
      await updateUser(user.id, { is_active_staff: !user.is_active_staff });
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(user) {
    if (!window.confirm(`Remove ${user.full_name || user.username}? This cannot be undone.`)) return;
    try {
      await deleteUser(user.id);
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <div className="page__header d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Staff</h4>
          <small className="text-muted">Manage staff accounts, roles, and access</small>
        </div>
        <button className="btn btn-primary" onClick={openCreateForm}>
          <i className="bi bi-person-plus me-1" /> Add Staff
        </button>
      </div>

      <div className="row g-2 mb-3">
        <div className="col-md-6">
          <input
            className="form-control"
            placeholder="Search by name, username, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="col-md-4">
          <select className="form-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All roles</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
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
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Department</th>
                <th>Phone</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center text-muted py-4">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-muted py-4">No staff found.</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.full_name || `${user.first_name} ${user.last_name}`.trim() || "—"}</td>
                    <td>{user.username}</td>
                    <td>
                      <span className="badge text-bg-light">
                        {ROLE_OPTIONS.find((r) => r.value === user.role)?.label || user.role}
                      </span>
                    </td>
                    <td>{departments.find((d) => d.id === user.department)?.name || "—"}</td>
                    <td>{user.phone || "—"}</td>
                    <td>
                      <button
                        className={`btn btn-sm ${user.is_active_staff ? "btn-outline-success" : "btn-outline-secondary"}`}
                        onClick={() => handleToggleActive(user)}
                      >
                        {user.is_active_staff ? "Active" : "Deactivated"}
                      </button>
                    </td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary me-2" onClick={() => openEditForm(user)}>
                        <i className="bi bi-pencil" />
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(user)}>
                        <i className="bi bi-trash" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="modal d-block" tabIndex={-1} style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <form className="modal-content" onSubmit={handleSubmit}>
              <div className="modal-header">
                <h5 className="modal-title">{editingId ? "Edit Staff" : "Add Staff"}</h5>
                <button type="button" className="btn-close" onClick={closeForm} />
              </div>
              <div className="modal-body">
                {formError && <div className="alert alert-danger">{formError}</div>}

                <div className="row g-2">
                  <div className="col-6">
                    <label className="form-label">First name</label>
                    <input
                      className="form-control"
                      value={form.first_name}
                      onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label">Last name</label>
                    <input
                      className="form-control"
                      value={form.last_name}
                      onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="mt-2">
                  <label className="form-label">Username</label>
                  <input
                    className="form-control"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    disabled={!!editingId}
                    required
                  />
                </div>

                <div className="mt-2">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div className="row g-2 mt-2">
                  <div className="col-6">
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
                  <div className="col-6">
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

                <div className="mt-2">
                  <label className="form-label">Phone</label>
                  <input
                    className="form-control"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>

                {!editingId && (
                  <div className="mt-2">
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
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={closeForm}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}