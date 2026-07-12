import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from "../../services/api";
import DataTable from "../../components/DataTable";
import SearchBar from "../../components/SearchBar";
import StatusBadge from "../../components/StatusBadge";
import ConfirmDialog from "../../components/ConfirmDialog";

const EMPTY_FORM = { name: "", consultation_fee: "", description: "", is_active: true };

const toArray = (data) => (Array.isArray(data) ? data : data?.results ?? []);

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [pendingAction, setPendingAction] = useState(null); // { type: "delete"|"toggle", dept }

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getDepartments();
      setDepartments(toArray(data));
    } catch (err) {
      toast.error(err.message || "Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  const visibleDepartments = search
    ? departments.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()))
    : departments;

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  };

  const openEditForm = (dept) => {
    setEditingId(dept.id);
    setForm({
      name: dept.name,
      consultation_fee: dept.consultation_fee,
      description: dept.description || "",
      is_active: dept.is_active,
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
        await updateDepartment(editingId, form);
        toast.success("Department updated");
      } else {
        await createDepartment(form);
        toast.success("Department added");
      }
      closeForm();
      load();
    } catch (err) {
      setFormError(err.message || "Failed to save department");
    } finally {
      setSaving(false);
    }
  };

  const requestToggleActive = (dept) => setPendingAction({ type: "toggle", dept });
  const requestDelete = (dept) => setPendingAction({ type: "delete", dept });

  const confirmPendingAction = async () => {
    if (!pendingAction) return;
    const { type, dept } = pendingAction;
    try {
      if (type === "toggle") {
        await updateDepartment(dept.id, { is_active: !dept.is_active });
        toast.success(dept.is_active ? "Department marked inactive" : "Department marked active");
      } else {
        await deleteDepartment(dept.id);
        toast.success("Department deleted");
      }
      load();
    } catch (err) {
      toast.error(err.message || "Action failed");
    } finally {
      setPendingAction(null);
    }
  };

  const columns = [
    {
      key: "name",
      label: "Department",
      render: (row) => (
        <div>
          <div className="cell-primary">{row.name}</div>
          <div className="text-2xs text-tertiary">{row.description || "—"}</div>
        </div>
      ),
    },
    {
      key: "consultation_fee",
      label: "Consultation Fee",
      render: (row) => <span className="cell-mono">KES {Number(row.consultation_fee).toLocaleString()}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <button
          className="btn-icon-only-labeled"
          onClick={() => requestToggleActive(row)}
          title={row.is_active ? "Mark inactive" : "Mark active"}
        >
          <StatusBadge status={row.is_active ? "Active" : "Inactive"} variant={row.is_active ? "success" : "secondary"} />
        </button>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex gap-1 justify-end">
          <button className="btn-icon-only" onClick={() => openEditForm(row)} title="Edit department">
            <i className="bi bi-pencil"></i>
          </button>
          <button
            className="btn-icon-only"
            style={{ color: "var(--danger-strong)" }}
            onClick={() => requestDelete(row)}
            title="Delete department"
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
          <h1 className="page-title">Departments</h1>
          <p className="page-subtitle">Manage departments and consultation fees</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-primary" onClick={openCreateForm}>
            <i className="bi bi-building-add me-2"></i>
            Add Department
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <SearchBar placeholder="Search departments..." onSearch={setSearch} delay={300} />
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {visibleDepartments.length} department{visibleDepartments.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="card-body p-0">
          <DataTable
            columns={columns}
            data={visibleDepartments}
            loading={loading}
            emptyMessage="No departments yet. Add one to get started."
          />
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <form className="modal-panel" onSubmit={handleSubmit}>
            <div className="modal-panel__header">
              <h2 className="modal-panel__title">{editingId ? "Edit Department" : "Add Department"}</h2>
              <button type="button" className="btn-icon-only" onClick={closeForm}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="modal-panel__body">
              {formError && <div className="alert alert-danger">{formError}</div>}

              <div className="form-field">
                <label className="form-label">Name</label>
                <input
                  className="form-control"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-field">
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

              <div className="form-field">
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
        title={pendingAction?.type === "delete" ? "Delete Department" : "Change Department Status"}
        message={
          pendingAction?.type === "delete"
            ? `Delete "${pendingAction?.dept?.name}"? Visits already linked to it will keep their history.`
            : `Are you sure you want to mark "${pendingAction?.dept?.name}" as ${pendingAction?.dept?.is_active ? "inactive" : "active"}?`
        }
        variant={pendingAction?.type === "delete" ? "danger" : "warning"}
      />
    </>
  );
}