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
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadQueue}
          >
            <i className="bi bi-arrow-clockwise me-2"></i>
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
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
          label="Completed Today"
          value={queue.filter((e) => e.status === "COMPLETED").length}
          icon="bi-check-circle"
          variant="success"
        />
      </div>

      <div className="card">
        <div className="card-header">
          <h5 className="card-title">Patient Queue</h5>
          <span className="badge bg-primary">{queue.length} patients</span>
        </div>
        <div className="card-body p-0">
          {queue.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-check-circle fs-2 d-block mb-2 text-success"></i>
              No patients in your queue
            </div>
          ) : (
            <div className="list-group list-group-flush">
              {queue.map((entry) => (
                <div
                  key={entry.id}
                  className="list-group-item d-flex align-items-center justify-content-between"
                >
                  <div className="d-flex align-items-center gap-3">
                    <span className="avatar avatar-sm">
                      {entry.patient_name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "?"}
                    </span>
                    <div>
                      <div className="d-flex align-items-center gap-2">
                        <span className="fw-semibold">{entry.patient_name}</span>
                        <span className="text-muted text-sm">
                          #{entry.hospital_number}
                        </span>
                        {entry.priority > 0 && (
                          <span className="badge bg-danger">Priority</span>
                        )}
                      </div>
                      <div className="text-sm text-muted">
                        <StatusBadge status={entry.status} />
                        <span className="ms-2">Waiting: {formatTimeAgo(entry.created_at)}</span>
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
                          <span className="spinner-border spinner-border-sm" />
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
                        onClick={() => navigate(`/doctor/consultation/${entry.visit}`)}
                      >
                        <i className="bi bi-clipboard2-pulse me-1"></i>
                        Continue
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