//src/pages/doctor/DoctorDashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { getMyQueue, callNextInQueue } from "../../services/api";
import StatusBadge from "../../components/StatusBadge";
import LoadingSpinner from "../../components/LoadingSpinner";
import StatCard from "../../components/StatCard";
import { formatTimeAgo } from "../../utils/formatters";

export default function DoctorDashboard() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadQueue = async () => {
    try {
      const data = await getMyQueue("DOCTOR");
      setQueue(data || []);
    } catch (err) {
      toast.error(err.message || "Failed to load doctor queue");
    } finally {
      setLoading(false);
    }
  };

  const handleStartConsultation = async (entryId) => {
    setProcessing((prev) => ({ ...prev, [entryId]: true }));
    try {
      await callNextInQueue(entryId);
      const entry = queue.find((e) => e.id === entryId);
      toast.success(`Starting consultation with ${entry?.patient_name}`);
      navigate(`/doctor/consultation/${entry?.visit}`);
    } catch (err) {
      toast.error(err.message || "Failed to start consultation");
    } finally {
      setProcessing((prev) => ({ ...prev, [entryId]: false }));
    }
  };

  // A paused consultation doesn't need to go through call-next again — the
  // doctor is already assigned, they just need to jump back into the same
  // consultation screen and hit "Resume" there.
  const handleContinueConsultation = (entry) => {
    navigate(`/doctor/consultation/${entry.visit}`);
  };

  if (loading) return <LoadingSpinner />;

  const waitingCount = queue.filter((e) => e.status === "WAITING_DOCTOR" || e.status === "WAITING").length;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Doctor Dashboard</div>
          <h1 className="page-title">My Queue</h1>
          <p className="page-subtitle">Manage your patient consultations</p>
        </div>
        <div className="page-header__actions">
          <button type="button" className="btn btn-secondary" onClick={loadQueue}>
            <i className="bi bi-arrow-clockwise me-2"></i>
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid mb-6">
        <StatCard
          label="Waiting Patients"
          value={waitingCount}
          icon="bi-hourglass-split"
          variant="warning"
        />
        <StatCard
          label="In Consultation"
          value={queue.filter((e) => e.status === "CONSULTING").length}
          icon="bi-clipboard2-pulse"
          variant="primary"
        />
        <StatCard
          label="Paused"
          value={queue.filter((e) => e.status === "PAUSED").length}
          icon="bi-pause-circle"
          variant="warning"
        />
        <StatCard
          label="Completed Today"
          value={queue.filter((e) => e.status === "COMPLETED").length}
          icon="bi-check-circle"
          variant="success"
        />
      </div>

      <div className="card">
        <div className="card-header">
          <h5 className="card-title">Patient Queue</h5>
          <span className="badge badge-primary">{queue.length} patients</span>
        </div>
        <div className="card-body p-0">
          {queue.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-check-circle" style={{ fontSize: "1.5rem" }}></i>
              </div>
              <div className="empty-state__title">No patients in your queue</div>
              <div className="empty-state__desc">New patients will appear here once they're ready for consultation.</div>
            </div>
          ) : (
            <div className="divide-y">
              {queue.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between px-5 py-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="avatar avatar-sm">
                      {entry.patient_name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "?"}
                    </span>
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
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={entry.status} />
                        <span className="text-xs text-tertiary">
                          Waiting: {formatTimeAgo(entry.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    {entry.status === "WAITING_DOCTOR" || entry.status === "WAITING" ? (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleStartConsultation(entry.id)}
                        disabled={processing[entry.id]}
                      >
                        {processing[entry.id] ? (
                          <span className="spinner spinner-inverse" style={{ width: 16, height: 16 }} />
                        ) : (
                          <>
                            <i className="bi bi-play-circle me-1"></i>
                            Start Consultation
                          </>
                        )}
                      </button>
                    ) : entry.status === "CONSULTING" ? (
                      <button
                        type="button"
                        className="btn btn-success btn-sm"
                        onClick={() => handleContinueConsultation(entry)}
                      >
                        <i className="bi bi-clipboard2-pulse me-1"></i>
                        Continue
                      </button>
                    ) : entry.status === "PAUSED" ? (
                      <button
                        type="button"
                        className="btn btn-warning btn-sm"
                        onClick={() => handleContinueConsultation(entry)}
                      >
                        <i className="bi bi-play-circle me-1"></i>
                        Continue (Paused)
                      </button>
                    ) : (
                      <StatusBadge status={entry.status} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}