import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getConsultations,
  getVisit,
  startConsultation,
  saveConsultation,
  addDiagnosis,
  pauseConsultation,
  resumeConsultation,
  completeConsultation,
  getPatientSummary,
  lookupIcd10,
  searchMedicines,
  createPrescription,
  createLabOrder,
  createRadiologyOrder,
} from "../../services/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import Modal from "../../components/Modal";
import StatusBadge from "../../components/StatusBadge";
import { formatDate, formatDateTime } from "../../utils/formatters";

export default function Consultation() {
  const { visitId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [consultation, setConsultation] = useState(null);
  const [patientSummary, setPatientSummary] = useState(null);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    chief_complaint: "",
    history_of_present_illness: "",
    physical_examination: "",
    treatment_plan: "",
    clinical_notes: "",
  });

  const [diagnosisSearch, setDiagnosisSearch] = useState("");
  const [diagnosisResults, setDiagnosisResults] = useState([]);
  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState(null);

  const [medSearch, setMedSearch] = useState("");
  const [medResults, setMedResults] = useState([]);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [prescriptionForm, setPrescriptionForm] = useState({
    medicine: "",
    dosage: "",
    frequency: "",
    duration: "",
    quantity: "",
    instructions: "",
  });

  const [showLabModal, setShowLabModal] = useState(false);
  const [labForm, setLabForm] = useState({ test: "" });
  const [labTests, setLabTests] = useState([]);

  const [showRadiologyModal, setShowRadiologyModal] = useState(false);
  const [radiologyForm, setRadiologyForm] = useState({ test: "" });
  const [radiologyTests, setRadiologyTests] = useState([]);

  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseForm, setPauseForm] = useState({ pause_reason: "OTHER", pause_notes: "" });

  useEffect(() => {
    loadConsultation();
  }, [visitId]);

  const loadConsultation = async () => {
    setLoading(true);
    try {
      const visit = await getVisit(visitId);

      // Try to get existing consultation for this visit
      const consultationsResp = await getConsultations({ visit: visitId });
      let cons;
      if (consultationsResp.results && consultationsResp.results.length > 0) {
        cons = consultationsResp.results[0];
      } else {
        // Start new consultation
        cons = await startConsultation({ visit: visitId });
      }

      setConsultation(cons);
      setForm({
        chief_complaint: cons.chief_complaint || "",
        history_of_present_illness: cons.history_of_present_illness || "",
        physical_examination: cons.physical_examination || "",
        treatment_plan: cons.treatment_plan || "",
        clinical_notes: cons.clinical_notes || "",
      });
      setEditing(true);

      // Load patient summary using the patient id from the visit
      const summary = await getPatientSummary(visit.patient);
      setPatientSummary(summary);
    } catch (err) {
      toast.error(err.message || "Failed to load consultation");
      navigate("/doctor");
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await saveConsultation(consultation.id, form);
      toast.success("Consultation saved");
      loadConsultation();
    } catch (err) {
      toast.error(err.message || "Failed to save consultation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!window.confirm("Complete this consultation?")) return;
    setSubmitting(true);
    try {
      await completeConsultation(consultation.id);
      toast.success("Consultation completed!");
      navigate("/doctor");
    } catch (err) {
      toast.error(err.message || "Failed to complete consultation");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePause = async () => {
    setSubmitting(true);
    try {
      await pauseConsultation(consultation.id, pauseForm);
      toast.success("Consultation paused");
      setShowPauseModal(false);
      loadConsultation();
    } catch (err) {
      toast.error(err.message || "Failed to pause consultation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResume = async () => {
    setSubmitting(true);
    try {
      await resumeConsultation(consultation.id);
      toast.success("Consultation resumed");
      loadConsultation();
    } catch (err) {
      toast.error(err.message || "Failed to resume consultation");
    } finally {
      setSubmitting(false);
    }
  };

  const searchDiagnosis = async (query) => {
    if (!query || query.length < 2) {
      setDiagnosisResults([]);
      return;
    }
    try {
      const results = await lookupIcd10(query);
      setDiagnosisResults(results || []);
    } catch (err) {
      console.error("Diagnosis search failed:", err);
    }
  };

  const addDiagnosisToConsultation = async () => {
    if (!selectedDiagnosis) return;
    try {
      await addDiagnosis(consultation.id, {
        icd10_code: selectedDiagnosis.code,
        is_primary: consultation.diagnoses?.length === 0,
      });
      toast.success("Diagnosis added");
      setShowDiagnosisModal(false);
      setSelectedDiagnosis(null);
      setDiagnosisSearch("");
      loadConsultation();
    } catch (err) {
      toast.error(err.message || "Failed to add diagnosis");
    }
  };

  const searchMedicinesForRx = async (query) => {
    if (!query || query.length < 2) {
      setMedResults([]);
      return;
    }
    try {
      const results = await searchMedicines(query);
      setMedResults(results || []);
    } catch (err) {
      console.error("Medicine search failed:", err);
    }
  };

  const createPrescriptionForPatient = async () => {
    if (!prescriptionForm.medicine || !prescriptionForm.dosage) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      await createPrescription({
        consultation: consultation.id,
        ...prescriptionForm,
        quantity: parseInt(prescriptionForm.quantity) || 1,
      });
      toast.success("Prescription created");
      setShowPrescriptionModal(false);
      setPrescriptionForm({ medicine: "", dosage: "", frequency: "", duration: "", quantity: "", instructions: "" });
      loadConsultation();
    } catch (err) {
      toast.error(err.message || "Failed to create prescription");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Doctor</div>
          <h1 className="page-title">Consultation</h1>
          <p className="page-subtitle">
            {consultation?.patient_name || "Patient"} · {formatDate(consultation?.started_at)}
          </p>
        </div>
        <div className="page-header__actions">
          <StatusBadge status={consultation?.status} />
          {consultation?.status === "IN_PROGRESS" && (
            <>
              <button
                type="button"
                className="btn btn-warning"
                onClick={() => setShowPauseModal(true)}
                disabled={submitting}
              >
                <i className="bi bi-pause-circle me-2"></i>
                Pause
              </button>
              <button
                type="button"
                className="btn btn-success"
                onClick={handleComplete}
                disabled={submitting}
              >
                <i className="bi bi-check2-circle me-2"></i>
                Complete
              </button>
            </>
          )}
          {consultation?.status === "PAUSED" && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleResume}
              disabled={submitting}
            >
              <i className="bi bi-play-circle me-2"></i>
              Resume
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/doctor")}
          >
            <i className="bi bi-arrow-left me-2"></i>
            Back
          </button>
        </div>
      </div>

      <div className="row">
        {/* Patient Info Sidebar */}
        <div className="col-lg-3">
          <div className="card mb-3">
            <div className="card-body">
              <div className="text-center mb-3">
                <span className="avatar avatar-lg">
                  {consultation?.patient_name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "?"}
                </span>
                <h5 className="mt-2 mb-0">{consultation?.patient_name}</h5>
                <span className="text-muted text-sm">
                  #{consultation?.patient_id}
                </span>
              </div>
              <hr />
              <div className="info-grid">
                <div>
                  <div className="info-item__label">Age</div>
                  <div className="info-item__value">{patientSummary?.patient?.age || "—"}</div>
                </div>
                <div>
                  <div className="info-item__label">Gender</div>
                  <div className="info-item__value">{patientSummary?.patient?.gender || "—"}</div>
                </div>
                <div>
                  <div className="info-item__label">Phone</div>
                  <div className="info-item__value">{patientSummary?.patient?.phone || "—"}</div>
                </div>
              </div>
            </div>
          </div>

          {patientSummary?.allergies?.length > 0 && (
            <div className="card mb-3">
              <div className="card-header">
                <h6 className="mb-0">Allergies</h6>
              </div>
              <div className="card-body">
                {patientSummary.allergies.map((a) => (
                  <div key={a.id} className="d-flex justify-content-between align-items-center mb-1">
                    <span>{a.substance}</span>
                    <StatusBadge status={a.severity} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {consultation?.vitals && (
            <div className="card">
              <div className="card-header">
                <h6 className="mb-0">Vitals</h6>
              </div>
              <div className="card-body">
                <div className="vitals-grid">
                  <div className="vital-tile">
                    <div className="vital-tile__value">{consultation.vitals.bmi || "—"}</div>
                    <div className="vital-tile__label">BMI</div>
                  </div>
                  <div className="vital-tile">
                    <div className="vital-tile__value">{consultation.vitals.temperature_c || "—"}°C</div>
                    <div className="vital-tile__label">Temp</div>
                  </div>
                  <div className="vital-tile">
                    <div className="vital-tile__value">{consultation.vitals.pulse_bpm || "—"}</div>
                    <div className="vital-tile__label">Pulse</div>
                  </div>
                  <div className="vital-tile">
                    <div className="vital-tile__value">
                      {consultation.vitals.bp_systolic || "—"}/{consultation.vitals.bp_diastolic || "—"}
                    </div>
                    <div className="vital-tile__label">BP</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Consultation Area */}
        <div className="col-lg-9">
          {/* Clinical Notes */}
          <div className="card mb-3">
            <div className="card-header">
              <h5 className="card-title">Clinical Notes</h5>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={handleSave}
                  disabled={submitting}
                >
                  {submitting ? (
                    <span className="spinner-border spinner-border-sm" />
                  ) : (
                    <i className="bi bi-save"></i>
                  )}
                  Save
                </button>
              </div>
            </div>
            <div className="card-body">
              <div className="field">
                <label className="field-label" htmlFor="chief_complaint">
                  Chief Complaint
                </label>
                <textarea
                  id="chief_complaint"
                  name="chief_complaint"
                  className="textarea"
                  rows={2}
                  placeholder="Patient's main reason for visit..."
                  value={form.chief_complaint}
                  onChange={handleFormChange}
                />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="history_of_present_illness">
                  History of Present Illness
                </label>
                <textarea
                  id="history_of_present_illness"
                  name="history_of_present_illness"
                  className="textarea"
                  rows={3}
                  placeholder="Detailed history of the current condition..."
                  value={form.history_of_present_illness}
                  onChange={handleFormChange}
                />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="physical_examination">
                  Physical Examination
                </label>
                <textarea
                  id="physical_examination"
                  name="physical_examination"
                  className="textarea"
                  rows={3}
                  placeholder="Physical exam findings..."
                  value={form.physical_examination}
                  onChange={handleFormChange}
                />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="treatment_plan">
                  Treatment Plan
                </label>
                <textarea
                  id="treatment_plan"
                  name="treatment_plan"
                  className="textarea"
                  rows={3}
                  placeholder="Treatment plan and recommendations..."
                  value={form.treatment_plan}
                  onChange={handleFormChange}
                />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="clinical_notes">
                  Clinical Notes
                </label>
                <textarea
                  id="clinical_notes"
                  name="clinical_notes"
                  className="textarea"
                  rows={2}
                  placeholder="Additional clinical notes..."
                  value={form.clinical_notes}
                  onChange={handleFormChange}
                />
              </div>
            </div>
          </div>

          {/* Diagnoses */}
          <div className="card mb-3">
            <div className="card-header">
              <h5 className="card-title">Diagnoses</h5>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => setShowDiagnosisModal(true)}
              >
                <i className="bi bi-plus-lg me-1"></i>
                Add Diagnosis
              </button>
            </div>
            <div className="card-body">
              {consultation?.diagnoses?.length === 0 ? (
                <div className="text-muted text-sm">No diagnoses added yet</div>
              ) : (
                <div className="d-flex flex-wrap gap-2">
                  {consultation?.diagnoses?.map((d) => (
                    <div key={d.id} className={`diagnosis-chip ${d.is_primary ? "is-primary" : ""}`}>
                      <span className="diagnosis-chip__code">{d.code}</span>
                      <span>{d.description}</span>
                      {d.is_primary && (
                        <span className="badge bg-primary text-xs">Primary</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Prescriptions */}
          <div className="card mb-3">
            <div className="card-header">
              <h5 className="card-title">Prescriptions</h5>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => setShowPrescriptionModal(true)}
              >
                <i className="bi bi-plus-lg me-1"></i>
                Prescribe
              </button>
            </div>
            <div className="card-body">
              {consultation?.prescriptions?.length === 0 ? (
                <div className="text-muted text-sm">No prescriptions yet</div>
              ) : (
                <div className="rx-list">
                  {consultation?.prescriptions?.map((rx) => (
                    <div key={rx.id} className="rx-item">
                      <div>
                        <div className="rx-item__name">{rx.medicine_name}</div>
                        <div className="rx-item__detail">
                          {rx.dosage} · {rx.frequency} · {rx.duration}
                          {rx.instructions && ` · ${rx.instructions}`}
                        </div>
                      </div>
                      <StatusBadge status={rx.is_dispensed ? "DISPENSED" : "PENDING"} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Lab & Radiology Orders */}
          <div className="row">
            <div className="col-md-6">
              <div className="card">
                <div className="card-header">
                  <h6 className="mb-0">Lab Orders</h6>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => setShowLabModal(true)}
                  >
                    <i className="bi bi-plus-lg me-1"></i>
                    Order Lab
                  </button>
                </div>
                <div className="card-body">
                  {consultation?.lab_orders?.length === 0 ? (
                    <div className="text-muted text-sm">No lab orders</div>
                  ) : (
                    consultation?.lab_orders?.map((order) => (
                      <div key={order.id} className="d-flex justify-content-between align-items-center py-1">
                        <span className="text-sm">{order.test_name}</span>
                        <StatusBadge status={order.status} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card">
                <div className="card-header">
                  <h6 className="mb-0">Radiology Orders</h6>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => setShowRadiologyModal(true)}
                  >
                    <i className="bi bi-plus-lg me-1"></i>
                    Order Radiology
                  </button>
                </div>
                <div className="card-body">
                  {consultation?.radiology_orders?.length === 0 ? (
                    <div className="text-muted text-sm">No radiology orders</div>
                  ) : (
                    consultation?.radiology_orders?.map((order) => (
                      <div key={order.id} className="d-flex justify-content-between align-items-center py-1">
                        <span className="text-sm">{order.test_name}</span>
                        <StatusBadge status={order.status} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Diagnosis Modal */}
      <Modal
        show={showDiagnosisModal}
        onClose={() => {
          setShowDiagnosisModal(false);
          setSelectedDiagnosis(null);
          setDiagnosisSearch("");
          setDiagnosisResults([]);
        }}
        title="Add Diagnosis"
        size="modal-lg"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowDiagnosisModal(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={addDiagnosisToConsultation}
              disabled={!selectedDiagnosis}
            >
              <i className="bi bi-plus-lg me-2"></i>
              Add Diagnosis
            </button>
          </>
        }
      >
        <div className="field">
          <label className="field-label" htmlFor="diagnosis_search">
            Search ICD-10 Codes
          </label>
          <input
            id="diagnosis_search"
            type="text"
            className="input"
            placeholder="Search by code or description..."
            value={diagnosisSearch}
            onChange={(e) => {
              setDiagnosisSearch(e.target.value);
              searchDiagnosis(e.target.value);
            }}
          />
        </div>
        {diagnosisResults.length > 0 && (
          <div className="list-group mt-2" style={{ maxHeight: 300, overflowY: "auto" }}>
            {diagnosisResults.map((d) => (
              <button
                key={d.code}
                type="button"
                className={`list-group-item list-group-item-action ${selectedDiagnosis?.code === d.code ? "active" : ""}`}
                onClick={() => setSelectedDiagnosis(d)}
              >
                <strong>{d.code}</strong> — {d.description}
              </button>
            ))}
          </div>
        )}
        {selectedDiagnosis && (
          <div className="mt-3 p-2 bg-primary-soft rounded">
            Selected: <strong>{selectedDiagnosis.code}</strong> — {selectedDiagnosis.description}
          </div>
        )}
      </Modal>

      {/* Prescription Modal */}
      <Modal
        show={showPrescriptionModal}
        onClose={() => {
          setShowPrescriptionModal(false);
          setPrescriptionForm({ medicine: "", dosage: "", frequency: "", duration: "", quantity: "", instructions: "" });
          setMedResults([]);
          setMedSearch("");
        }}
        title="New Prescription"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowPrescriptionModal(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={createPrescriptionForPatient}
              disabled={submitting}
            >
              {submitting ? (
                <span className="spinner-border spinner-border-sm" />
              ) : (
                <>
                  <i className="bi bi-plus-lg me-2"></i>
                  Prescribe
                </>
              )}
            </button>
          </>
        }
      >
        <div className="field">
          <label className="field-label" htmlFor="med_search">
            Medicine <span className="required">*</span>
          </label>
          <input
            id="med_search"
            type="text"
            className="input"
            placeholder="Search for medicine..."
            value={medSearch}
            onChange={(e) => {
              setMedSearch(e.target.value);
              searchMedicinesForRx(e.target.value);
            }}
          />
          {medResults.length > 0 && (
            <div className="list-group mt-1" style={{ maxHeight: 150, overflowY: "auto" }}>
              {medResults.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`list-group-item list-group-item-action ${prescriptionForm.medicine === m.id ? "active" : ""}`}
                  onClick={() => {
                    setPrescriptionForm((prev) => ({ ...prev, medicine: m.id }));
                    setMedSearch(m.name);
                    setMedResults([]);
                  }}
                >
                  {m.name} — {m.unit_price && `KES ${m.unit_price}`}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="field">
              <label className="field-label" htmlFor="rx_dosage">
                Dosage <span className="required">*</span>
              </label>
              <input
                id="rx_dosage"
                name="dosage"
                type="text"
                className="input"
                placeholder="e.g., 500mg"
                value={prescriptionForm.dosage}
                onChange={(e) => setPrescriptionForm((prev) => ({ ...prev, dosage: e.target.value }))}
              />
            </div>
          </div>
          <div className="col-md-6">
            <div className="field">
              <label className="field-label" htmlFor="rx_frequency">
                Frequency
              </label>
              <input
                id="rx_frequency"
                name="frequency"
                type="text"
                className="input"
                placeholder="e.g., 3x daily"
                value={prescriptionForm.frequency}
                onChange={(e) => setPrescriptionForm((prev) => ({ ...prev, frequency: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-md-4">
            <div className="field">
              <label className="field-label" htmlFor="rx_duration">
                Duration
              </label>
              <input
                id="rx_duration"
                name="duration"
                type="text"
                className="input"
                placeholder="e.g., 5 days"
                value={prescriptionForm.duration}
                onChange={(e) => setPrescriptionForm((prev) => ({ ...prev, duration: e.target.value }))}
              />
            </div>
          </div>
          <div className="col-md-4">
            <div className="field">
              <label className="field-label" htmlFor="rx_quantity">
                Quantity
              </label>
              <input
                id="rx_quantity"
                name="quantity"
                type="number"
                className="input"
                placeholder="e.g., 10"
                value={prescriptionForm.quantity}
                onChange={(e) => setPrescriptionForm((prev) => ({ ...prev, quantity: e.target.value }))}
              />
            </div>
          </div>
          <div className="col-md-4">
            <div className="field">
              <label className="field-label" htmlFor="rx_instructions">
                Instructions
              </label>
              <input
                id="rx_instructions"
                name="instructions"
                type="text"
                className="input"
                placeholder="e.g., After meals"
                value={prescriptionForm.instructions}
                onChange={(e) => setPrescriptionForm((prev) => ({ ...prev, instructions: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Lab Order Modal */}
      <Modal
        show={showLabModal}
        onClose={() => {
          setShowLabModal(false);
          setLabForm({ test: "" });
        }}
        title="Order Lab Test"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowLabModal(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={async () => {
                if (!labForm.test) {
                  toast.error("Please select a test");
                  return;
                }
                try {
                  await createLabOrder({ consultation: consultation.id, test: labForm.test });
                  toast.success("Lab order created");
                  setShowLabModal(false);
                  loadConsultation();
                } catch (err) {
                  toast.error(err.message || "Failed to create lab order");
                }
              }}
            >
              <i className="bi bi-plus-lg me-2"></i>
              Order Lab Test
            </button>
          </>
        }
      >
        <div className="field">
          <label className="field-label" htmlFor="lab_test">
            Select Lab Test
          </label>
          <select
            id="lab_test"
            className="select"
            value={labForm.test}
            onChange={(e) => setLabForm({ test: e.target.value })}
          >
            <option value="">Choose a test...</option>
            {/* Lab tests would be loaded from API */}
            <option value="CBC">Complete Blood Count</option>
            <option value="MALARIA">Malaria Test</option>
            <option value="URINALYSIS">Urinalysis</option>
            <option value="BLOOD_SUGAR">Blood Sugar</option>
            <option value="LFT">Liver Function Test</option>
            <option value="KFT">Kidney Function Test</option>
          </select>
        </div>
      </Modal>

      {/* Radiology Order Modal */}
      <Modal
        show={showRadiologyModal}
        onClose={() => {
          setShowRadiologyModal(false);
          setRadiologyForm({ test: "" });
        }}
        title="Order Radiology Test"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowRadiologyModal(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={async () => {
                if (!radiologyForm.test) {
                  toast.error("Please select a test");
                  return;
                }
                try {
                  await createRadiologyOrder({ consultation: consultation.id, test: radiologyForm.test });
                  toast.success("Radiology order created");
                  setShowRadiologyModal(false);
                  loadConsultation();
                } catch (err) {
                  toast.error(err.message || "Failed to create radiology order");
                }
              }}
            >
              <i className="bi bi-plus-lg me-2"></i>
              Order Radiology
            </button>
          </>
        }
      >
        <div className="field">
          <label className="field-label" htmlFor="radiology_test">
            Select Radiology Test
          </label>
          <select
            id="radiology_test"
            className="select"
            value={radiologyForm.test}
            onChange={(e) => setRadiologyForm({ test: e.target.value })}
          >
            <option value="">Choose a test...</option>
            <option value="XRAY">X-Ray</option>
            <option value="CT_SCAN">CT Scan</option>
            <option value="MRI">MRI</option>
            <option value="ULTRASOUND">Ultrasound</option>
            <option value="ECG">ECG</option>
          </select>
        </div>
      </Modal>

      {/* Pause Modal */}
      <Modal
        show={showPauseModal}
        onClose={() => setShowPauseModal(false)}
        title="Pause Consultation"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowPauseModal(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-warning"
              onClick={handlePause}
              disabled={submitting}
            >
              {submitting ? (
                <span className="spinner-border spinner-border-sm" />
              ) : (
                <>
                  <i className="bi bi-pause-circle me-2"></i>
                  Pause
                </>
              )}
            </button>
          </>
        }
      >
        <div className="field">
          <label className="field-label" htmlFor="pause_reason">
            Pause Reason
          </label>
          <select
            id="pause_reason"
            className="select"
            value={pauseForm.pause_reason}
            onChange={(e) => setPauseForm((prev) => ({ ...prev, pause_reason: e.target.value }))}
          >
            <option value="WAITING_LAB">Waiting for Lab Results</option>
            <option value="WAITING_RADIOLOGY">Waiting for Radiology</option>
            <option value="PATIENT_NOT_READY">Patient Not Ready</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="pause_notes">
            Notes
          </label>
          <input
            id="pause_notes"
            type="text"
            className="input"
            placeholder="Additional notes..."
            value={pauseForm.pause_notes}
            onChange={(e) => setPauseForm((prev) => ({ ...prev, pause_notes: e.target.value }))}
          />
        </div>
      </Modal>
    </>
  );
}