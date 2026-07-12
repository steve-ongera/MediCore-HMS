import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  getLabTestCatalog, createLabTest, updateLabTest, deleteLabTest,
  getRadiologyTestCatalog, createRadiologyTest, updateRadiologyTest, deleteRadiologyTest,
} from "../../services/api";
import DataTable from "../../components/DataTable";
import SearchBar from "../../components/SearchBar";
import StatusBadge from "../../components/StatusBadge";
import ConfirmDialog from "../../components/ConfirmDialog";

const EMPTY_FORM = { code: "", name: "", price: "", is_active: true };

const toArray = (data) => (Array.isArray(data) ? data : data?.results ?? []);

const TABS = {
  lab: {
    label: "Laboratory",
    get: getLabTestCatalog,
    create: createLabTest,
    update: updateLabTest,
    remove: deleteLabTest,
  },
  radiology: {
    label: "Radiology",
    get: getRadiologyTestCatalog,
    create: createRadiologyTest,
    update: updateRadiologyTest,
    remove: deleteRadiologyTest,
  },
};

export default function TestCatalog() {
  const [tab, setTab] = useState("lab");
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [pendingAction, setPendingAction] = useState(null); // { type: "delete"|"toggle", test }

  const active = TABS[tab];

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await active.get();
      setTests(toArray(data));
    } catch (err) {
      toast.error(err.message || "Failed to load test catalog");
    } finally {
      setLoading(false);
    }
  };

  const visibleTests = search
    ? tests.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()) || t.code.toLowerCase().includes(search.toLowerCase()))
    : tests;

  const switchTab = (next) => {
    setTab(next);
    setSearch("");
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  };

  const openEditForm = (test) => {
    setEditingId(test.id);
    setForm({ code: test.code, name: test.name, price: test.price, is_active: test.is_active });
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
        await active.update(editingId, form);
        toast.success("Test updated");
      } else {
        await active.create(form);
        toast.success("Test added");
      }
      closeForm();
      load();
    } catch (err) {
      setFormError(err.message || "Failed to save test");
    } finally {
      setSaving(false);
    }
  };

  const requestToggleActive = (test) => setPendingAction({ type: "toggle", test });
  const requestDelete = (test) => setPendingAction({ type: "delete", test });

  const confirmPendingAction = async () => {
    if (!pendingAction) return;
    const { type, test } = pendingAction;
    try {
      if (type === "toggle") {
        await active.update(test.id, { is_active: !test.is_active });
        toast.success(test.is_active ? "Test deactivated" : "Test reactivated");
      } else {
        await active.remove(test.id);
        toast.success("Test deleted");
      }
      load();
    } catch (err) {
      toast.error(err.message || "Action failed");
    } finally {
      setPendingAction(null);
    }
  };

  const columns = [
    { key: "code", label: "Code", render: (row) => <span className="cell-mono">{row.code}</span> },
    { key: "name", label: "Test Name", render: (row) => <span className="cell-primary">{row.name}</span> },
    { key: "price", label: "Price", render: (row) => <span className="cell-mono">KES {Number(row.price).toLocaleString()}</span> },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <button className="btn-icon-only-labeled" onClick={() => requestToggleActive(row)} title={row.is_active ? "Deactivate" : "Reactivate"}>
          <StatusBadge status={row.is_active ? "Active" : "Inactive"} variant={row.is_active ? "success" : "secondary"} />
        </button>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex gap-1 justify-end">
          <button className="btn-icon-only" onClick={() => openEditForm(row)} title="Edit test">
            <i className="bi bi-pencil"></i>
          </button>
          <button
            className="btn-icon-only"
            style={{ color: "var(--danger-strong)" }}
            onClick={() => requestDelete(row)}
            title="Delete test"
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
          <h1 className="page-title">Test Catalog</h1>
          <p className="page-subtitle">Manage laboratory and radiology tests and pricing</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-primary" onClick={openCreateForm}>
            <i className="bi bi-plus-lg me-2"></i>
            Add Test
          </button>
        </div>
      </div>

      <div className="tab-bar mb-3">
        {Object.entries(TABS).map(([key, t]) => (
          <button
            key={key}
            className={`tab-bar__item${tab === key ? " is-active" : ""}`}
            onClick={() => switchTab(key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <SearchBar placeholder="Search by code or name..." onSearch={setSearch} delay={300} />
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {visibleTests.length} test{visibleTests.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="card-body p-0">
          <DataTable
            columns={columns}
            data={visibleTests}
            loading={loading}
            emptyMessage={`No ${active.label.toLowerCase()} tests yet. Add one to get started.`}
          />
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <form className="modal-panel" onSubmit={handleSubmit}>
            <div className="modal-panel__header">
              <h2 className="modal-panel__title">{editingId ? `Edit ${active.label} Test` : `Add ${active.label} Test`}</h2>
              <button type="button" className="btn-icon-only" onClick={closeForm}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="modal-panel__body">
              {formError && <div className="alert alert-danger">{formError}</div>}

              <div className="form-field">
                <label className="form-label">Code</label>
                <input
                  className="form-control"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  required
                />
              </div>

              <div className="form-field">
                <label className="form-label">Test Name</label>
                <input
                  className="form-control"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-field">
                <label className="form-label">Price (KES)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  required
                />
              </div>

              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="test-active"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="test-active">Active</label>
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
        title={pendingAction?.type === "delete" ? "Delete Test" : "Change Test Status"}
        message={
          pendingAction?.type === "delete"
            ? `Delete "${pendingAction?.test?.name}"? Existing orders will keep their history.`
            : `Are you sure you want to ${pendingAction?.test?.is_active ? "deactivate" : "reactivate"} "${pendingAction?.test?.name}"?`
        }
        variant={pendingAction?.type === "delete" ? "danger" : "warning"}
      />
    </>
  );
}