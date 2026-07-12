import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from "../../services/api";
import DataTable from "../../components/DataTable";
import SearchBar from "../../components/SearchBar";
import ConfirmDialog from "../../components/ConfirmDialog";

const EMPTY_FORM = { name: "", phone: "", email: "", address: "" };

const toArray = (data) => (Array.isArray(data) ? data : data?.results ?? []);

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getSuppliers();
      setSuppliers(toArray(data));
    } catch (err) {
      toast.error(err.message || "Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  };

  const visibleSuppliers = search
    ? suppliers.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    : suppliers;

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  };

  const openEditForm = (supplier) => {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name,
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
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
        await updateSupplier(editingId, form);
        toast.success("Supplier updated");
      } else {
        await createSupplier(form);
        toast.success("Supplier added");
      }
      closeForm();
      load();
    } catch (err) {
      setFormError(err.message || "Failed to save supplier");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteSupplier(pendingDelete.id);
      toast.success("Supplier deleted");
      load();
    } catch (err) {
      toast.error(err.message || "Failed to delete supplier");
    } finally {
      setPendingDelete(null);
    }
  };

  const columns = [
    {
      key: "name",
      label: "Supplier",
      render: (row) => (
        <div className="table-row-avatar">
          <span className="avatar avatar-sm">
            {row.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
          </span>
          <span className="cell-primary">{row.name}</span>
        </div>
      ),
    },
    { key: "phone", label: "Phone", render: (row) => row.phone || "—" },
    { key: "email", label: "Email", render: (row) => row.email || "—" },
    { key: "address", label: "Address", render: (row) => row.address || "—" },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex gap-1 justify-end">
          <button className="btn-icon-only" onClick={() => openEditForm(row)} title="Edit supplier">
            <i className="bi bi-pencil"></i>
          </button>
          <button
            className="btn-icon-only"
            style={{ color: "var(--danger-strong)" }}
            onClick={() => setPendingDelete(row)}
            title="Delete supplier"
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
          <div className="page-eyebrow">Pharmacy</div>
          <h1 className="page-title">Suppliers</h1>
          <p className="page-subtitle">Manage medicine suppliers and contacts</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-primary" onClick={openCreateForm}>
            <i className="bi bi-truck me-2"></i>
            Add Supplier
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <SearchBar placeholder="Search suppliers..." onSearch={setSearch} delay={300} />
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {visibleSuppliers.length} supplier{visibleSuppliers.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="card-body p-0">
          <DataTable
            columns={columns}
            data={visibleSuppliers}
            loading={loading}
            emptyMessage="No suppliers yet. Add one to get started."
          />
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <form className="modal-panel" onSubmit={handleSubmit}>
            <div className="modal-panel__header">
              <h2 className="modal-panel__title">{editingId ? "Edit Supplier" : "Add Supplier"}</h2>
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
                <label className="form-label">Phone</label>
                <input
                  className="form-control"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
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

              <div className="form-field">
                <label className="form-label">Address</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
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
        show={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Supplier"
        message={`Delete "${pendingDelete?.name}"? Batches already linked to it will keep their history.`}
        variant="danger"
      />
    </>
  );
}