// src/components/StatCard.jsx
export default function StatCard({ label, value, icon, variant = "primary" }) {
  return (
    <div className="col-sm-6 col-lg-3">
      <div className="card border-0 shadow-sm h-100">
        <div className="card-body d-flex align-items-center gap-3">
          <div
            className={`rounded-3 d-flex align-items-center justify-content-center bg-${variant} bg-opacity-10 text-${variant}`}
            style={{ width: 48, height: 48, fontSize: "1.4rem" }}
          >
            <i className={`bi ${icon}`}></i>
          </div>
          <div>
            <div className="text-muted small">{label}</div>
            <div className="fs-4 fw-semibold">{value}</div>
          </div>
        </div>
      </div>
    </div>
  );
}