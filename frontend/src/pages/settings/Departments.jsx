// src/pages/settings/Departments.jsx
import { useEffect, useState } from "react";

import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from "../../services/api";

const EMPTY_FORM = { name: "", consultation_fee: "", description: "", is_active: true };

const toArray = (data) => (Array.isArray(data) ? data : data?.results ?? []);

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await getDepartments();
      setDepartments(toArray(data));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openCreateForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(dept) {
    setEditingId(dept.id);
    setForm({
      name: dept.name,
      consultation_fee: dept.consultation_fee,
      description: dept.description || "",
      is_active: dept.is_active,
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
        await updateDepartment(editingId, form);
      } else {
        await createDepartment(form);
      }
      closeForm();
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(dept) {
    try {
      await updateDepartment(dept.id, { is_active: !dept.is_active });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(dept) {
    if (!window.confirm(`Delete "${dept.name}"? Visits already linked to it will keep their history.`)) return;
    try {
      await deleteDepartment(dept.id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <div className="page__header d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Departments</h4>
          <small className="text-muted">Manage departments and consultation fees</small>
        </div>
        <button className="btn btn-primary" onClick={openCreateForm}>
          <i className="bi bi-building-add me-1" /> Add Department
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Name</th>
                <th>Consultation Fee (KES)</th>
                <th>Description</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center text-muted py-4">Loading...</td></tr>
              ) : departments.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-muted py-4">No departments yet.</td></tr>
              ) : (
                departments.map((dept) => (
                  <tr key={dept.id}>
                    <td>{dept.name}</td>
                    <td>KES {Number(dept.consultation_fee).toLocaleString()}</td>
                    <td className="text-muted">{dept.description || "—"}</td>
                    <td>
                      <button
                        className={`btn btn-sm ${dept.is_active ? "btn-outline-success" : "btn-outline-secondary"}`}
                        onClick={() => handleToggleActive(dept)}
                      >
                        {dept.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary me-2" onClick={() => openEditForm(dept)}>
                        <i className="bi bi-pencil" />
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(dept)}>
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
                <h5 className="modal-title">{editingId ? "Edit Department" : "Add Department"}</h5>
                <button type="button" className="btn-close" onClick={closeForm} />
              </div>
              <div className="modal-body">
                {formError && <div className="alert alert-danger">{formError}</div>}

                <div className="mb-2">
                  <label className="form-label">Name</label>
                  <input
                    className="form-control"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div className="mb-2">
                  <label className="form-label">Consultation Fee (KES)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-control"
                    value={form.consultation_fee}
                    onChange={(e) => setForm({ ...form, consultation_fee: e.target.value })}
                    required
                  />
                </div>

                <div className="mb-2">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="dept-active"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  />
                  <label className="form-check-label" htmlFor="dept-active">Active</label>
                </div>
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