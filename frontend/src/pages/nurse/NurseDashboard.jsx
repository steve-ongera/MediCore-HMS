import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getMyQueue, saveVitals, getQueue } from "../../services/api";
import StatusBadge from "../../components/StatusBadge";
import Modal from "../../components/Modal";
import LoadingSpinner from "../../components/LoadingSpinner";
import { formatTimeAgo } from "../../utils/formatters";

export default function NurseDashboard() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [vitals, setVitals] = useState({
    weight_kg: "",
    height_cm: "",
    temperature_c: "",
    pulse_bpm: "",
    respiratory_rate: "",
    bp_systolic: "",
    bp_diastolic: "",
    oxygen_saturation: "",
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadQueue = async () => {
    try {
      const data = await getMyQueue("NURSE");
      setQueue(data || []);
    } catch (err) {
      toast.error(err.message || "Failed to load nurse queue");
    } finally {
      setLoading(false);
    }
  };

  const handleVitalsChange = (e) => {
    const { name, value } = e.target;
    setVitals((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateVitals = () => {
    const newErrors = {};
    if (!vitals.weight_kg || parseFloat(vitals.weight_kg) <= 0) {
      newErrors.weight_kg = "Weight is required";
    }
    if (!vitals.height_cm || parseFloat(vitals.height_cm) <= 0) {
      newErrors.height_cm = "Height is required";
    }
    if (!vitals.temperature_c) newErrors.temperature_c = "Temperature is required";
    if (!vitals.pulse_bpm || parseInt(vitals.pulse_bpm) <= 0) {
      newErrors.pulse_bpm = "Pulse is required";
    }
    if (!vitals.bp_systolic || parseInt(vitals.bp_systolic) <= 0) {
      newErrors.bp_systolic = "Systolic BP is required";
    }
    if (!vitals.bp_diastolic || parseInt(vitals.bp_diastolic) <= 0) {
      newErrors.bp_diastolic = "Diastolic BP is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitVitals = async (e) => {
    e.preventDefault();
    if (!validateVitals()) return;

    setSubmitting(true);
    try {
      await saveVitals({
        visit: selectedPatient.visit,
        ...vitals,
      });
      toast.success("Vitals recorded successfully!");
      setShowVitalsModal(false);
      setVitals({
        weight_kg: "",
        height_cm: "",
        temperature_c: "",
        pulse_bpm: "",
        respiratory_rate: "",
        bp_systolic: "",
        bp_diastolic: "",
        oxygen_saturation: "",
      });
      setSelectedPatient(null);
      loadQueue();
    } catch (err) {
      toast.error(err.message || "Failed to record vitals");
    } finally {
      setSubmitting(false);
    }
  };

  const openVitalsModal = (entry) => {
    setSelectedPatient(entry);
    setShowVitalsModal(true);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Nurse Station</div>
          <h1 className="page-title">Triage & Vitals</h1>
          <p className="page-subtitle">Record patient vitals before consultation</p>
        </div>
        <div className="page-header__actions">
          <button type="button" className="btn btn-secondary" onClick={loadQueue}>
            <i className="bi bi-arrow-clockwise me-2"></i>
            Refresh
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <h5 className="card-title">Waiting for Triage</h5>
            <span className="badge badge-primary">{queue.length}</span>
          </div>
          <div className="card-body p-0">
            {queue.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">
                  <i className="bi bi-check-circle" style={{ fontSize: "1.5rem" }}></i>
                </div>
                <div className="empty-state__title">No patients waiting for triage</div>
              </div>
            ) : (
              <div className="divide-y">
                {queue.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between px-5 py-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{entry.patient_name}</span>
                        <span className="text-tertiary text-xs">
                          #{entry.hospital_number}
                        </span>
                        {entry.priority > 0 && (
                          <span className="badge badge-danger">Priority</span>
                        )}
                      </div>
                      <div className="text-xs text-tertiary mt-1">
                        Waiting: {formatTimeAgo(entry.created_at)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => openVitalsModal(entry)}
                    >
                      <i className="bi bi-clipboard2-pulse me-1"></i>
                      Record Vitals
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-header">
              <h5 className="card-title">Quick Actions</h5>
            </div>
            <div className="card-body">
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={() => {
                    window.location.href = "/queue";
                  }}
                >
                  <i className="bi bi-hourglass-split me-2"></i>
                  View Full Queue
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-block"
                  onClick={loadQueue}
                >
                  <i className="bi bi-arrow-clockwise me-2"></i>
                  Refresh Queue
                </button>
              </div>
            </div>
          </div>

          <div className="card mt-4">
            <div className="card-header">
              <h5 className="card-title">Triage Guidelines</h5>
            </div>
            <div className="card-body text-sm">
              <ul className="flex flex-col gap-2">
                <li>Record all vital signs accurately</li>
                <li>Check for allergies before medication</li>
                <li>Flag urgent cases with priority</li>
                <li>Confirm patient identity before vitals</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Vitals Modal */}
      <Modal
        show={showVitalsModal}
        onClose={() => {
          setShowVitalsModal(false);
          setSelectedPatient(null);
          setVitals({});
          setErrors({});
        }}
        title="Record Vitals"
        size="modal-lg"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowVitalsModal(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmitVitals}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner spinner-inverse me-2" style={{ width: 16, height: 16 }} />
                  Saving...
                </>
              ) : (
                <>
                  <i className="bi bi-check2-circle me-2"></i>
                  Save Vitals
                </>
              )}
            </button>
          </>
        }
      >
        {selectedPatient && (
          <div className="mb-4 p-3 bg-primary-soft rounded-md">
            <strong>{selectedPatient.patient_name}</strong>
            <span className="text-tertiary ml-2 text-sm">
              #{selectedPatient.hospital_number}
            </span>
          </div>
        )}

        <div className="field-row">
          <div className="field">
            <label className="field-label" htmlFor="vitals_weight">
              Weight (kg) <span className="required">*</span>
            </label>
            <input
              id="vitals_weight"
              name="weight_kg"
              type="number"
              step="0.1"
              className={`input ${errors.weight_kg ? "has-error" : ""}`}
              placeholder="e.g., 70.5"
              value={vitals.weight_kg}
              onChange={handleVitalsChange}
            />
            {errors.weight_kg && <div className="field-error">{errors.weight_kg}</div>}
          </div>
          <div className="field">
            <label className="field-label" htmlFor="vitals_height">
              Height (cm) <span className="required">*</span>
            </label>
            <input
              id="vitals_height"
              name="height_cm"
              type="number"
              step="0.1"
              className={`input ${errors.height_cm ? "has-error" : ""}`}
              placeholder="e.g., 175"
              value={vitals.height_cm}
              onChange={handleVitalsChange}
            />
            {errors.height_cm && <div className="field-error">{errors.height_cm}</div>}
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label className="field-label" htmlFor="vitals_temperature">
              Temperature (°C) <span className="required">*</span>
            </label>
            <input
              id="vitals_temperature"
              name="temperature_c"
              type="number"
              step="0.1"
              className={`input ${errors.temperature_c ? "has-error" : ""}`}
              placeholder="e.g., 36.5"
              value={vitals.temperature_c}
              onChange={handleVitalsChange}
            />
            {errors.temperature_c && <div className="field-error">{errors.temperature_c}</div>}
          </div>
          <div className="field">
            <label className="field-label" htmlFor="vitals_pulse">
              Pulse (BPM) <span className="required">*</span>
            </label>
            <input
              id="vitals_pulse"
              name="pulse_bpm"
              type="number"
              className={`input ${errors.pulse_bpm ? "has-error" : ""}`}
              placeholder="e.g., 72"
              value={vitals.pulse_bpm}
              onChange={handleVitalsChange}
            />
            {errors.pulse_bpm && <div className="field-error">{errors.pulse_bpm}</div>}
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label className="field-label" htmlFor="vitals_respiratory">
              Respiratory Rate
            </label>
            <input
              id="vitals_respiratory"
              name="respiratory_rate"
              type="number"
              className="input"
              placeholder="e.g., 16"
              value={vitals.respiratory_rate}
              onChange={handleVitalsChange}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="vitals_oxygen">
              Oxygen Saturation (%)
            </label>
            <input
              id="vitals_oxygen"
              name="oxygen_saturation"
              type="number"
              className="input"
              placeholder="e.g., 98"
              value={vitals.oxygen_saturation}
              onChange={handleVitalsChange}
            />
          </div>
        </div>

        <div className="field">
          <label className="field-label">
            Blood Pressure <span className="required">*</span>
          </label>
          <div className="field-row">
            <div>
              <input
                name="bp_systolic"
                type="number"
                className={`input ${errors.bp_systolic ? "has-error" : ""}`}
                placeholder="Systolic"
                value={vitals.bp_systolic}
                onChange={handleVitalsChange}
              />
              {errors.bp_systolic && <div className="field-error">{errors.bp_systolic}</div>}
            </div>
            <div>
              <input
                name="bp_diastolic"
                type="number"
                className={`input ${errors.bp_diastolic ? "has-error" : ""}`}
                placeholder="Diastolic"
                value={vitals.bp_diastolic}
                onChange={handleVitalsChange}
              />
              {errors.bp_diastolic && <div className="field-error">{errors.bp_diastolic}</div>}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}