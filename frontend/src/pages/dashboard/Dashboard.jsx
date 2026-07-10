import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { getDashboard } from "../../services/api";
import StatCard from "../../components/StatCard";
import LoadingSpinner from "../../components/LoadingSpinner";
import { formatCurrency, formatDate } from "../../utils/formatters";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const result = await getDashboard();
      setData(result);
    } catch (err) {
      toast.error(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const { cards, charts } = data || {};

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Overview</div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back! Here's what's happening today.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stat-grid mb-4">
        <StatCard
          label="Today's Patients"
          value={cards?.todays_patients || 0}
          icon="bi-people"
          variant="primary"
        />
        <StatCard
          label="Waiting Patients"
          value={cards?.waiting_patients || 0}
          icon="bi-hourglass-split"
          variant="warning"
        />
        <StatCard
          label="Today's Revenue"
          value={formatCurrency(cards?.todays_revenue || 0)}
          icon="bi-cash-stack"
          variant="success"
        />
        <StatCard
          label="Consultations Today"
          value={cards?.todays_consultations || 0}
          icon="bi-clipboard2-pulse"
          variant="info"
        />
        <StatCard
          label="Pending Lab"
          value={cards?.pending_lab || 0}
          icon="bi-droplet-half"
          variant="danger"
        />
        <StatCard
          label="Pending Radiology"
          value={cards?.pending_radiology || 0}
          icon="bi-camera"
          variant="danger"
        />
        <StatCard
          label="Low Stock Alerts"
          value={cards?.medicine_stock_alerts || 0}
          icon="bi-box-seam"
          variant="warning"
        />
      </div>

      {/* Charts Section */}
      <div className="dashboard-grid">
        {/* Revenue Chart */}
        <div className="chart-card">
          <div className="chart-card__header">
            <h5 className="card-title">Revenue (Last 7 Days)</h5>
            <span className="text-muted small">Daily revenue trend</span>
          </div>
          <div style={{ height: 200 }}>
            {charts?.revenue && charts.revenue.length > 0 ? (
              <div className="d-flex align-items-end justify-content-between gap-2 h-100">
                {charts.revenue.map((item) => {
                  const max = Math.max(...charts.revenue.map((d) => parseFloat(d.revenue)), 1);
                  const height = (parseFloat(item.revenue) / max) * 180;
                  return (
                    <div key={item.date} className="d-flex flex-column align-items-center flex-1">
                      <div
                        className="bg-primary rounded"
                        style={{
                          height: Math.max(height, 4),
                          width: "100%",
                          maxWidth: 40,
                          minHeight: 4,
                          transition: "height 0.3s ease",
                        }}
                      />
                      <span className="text-2xs text-muted mt-1">
                        {formatDate(item.date, { day: "numeric" })}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-muted py-4">No revenue data available</div>
            )}
          </div>
        </div>

        {/* Visits Chart */}
        <div className="chart-card">
          <div className="chart-card__header">
            <h5 className="card-title">Visits (Last 7 Days)</h5>
            <span className="text-muted small">Daily visit count</span>
          </div>
          <div style={{ height: 200 }}>
            {charts?.visits && charts.visits.length > 0 ? (
              <div className="d-flex align-items-end justify-content-between gap-2 h-100">
                {charts.visits.map((item) => {
                  const max = Math.max(...charts.visits.map((d) => d.visits), 1);
                  const height = (item.visits / max) * 180;
                  return (
                    <div key={item.date} className="d-flex flex-column align-items-center flex-1">
                      <div
                        className="bg-success rounded"
                        style={{
                          height: Math.max(height, 4),
                          width: "100%",
                          maxWidth: 40,
                          minHeight: 4,
                          transition: "height 0.3s ease",
                        }}
                      />
                      <span className="text-2xs text-muted mt-1">
                        {formatDate(item.date, { day: "numeric" })}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-muted py-4">No visit data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Department Breakdown */}
      <div className="card mt-4">
        <div className="card-header">
          <h5 className="card-title">Department Activity (Last 30 Days)</h5>
        </div>
        <div className="card-body">
          {charts?.departments && charts.departments.length > 0 ? (
            <div className="d-flex flex-wrap gap-4">
              {charts.departments.map((dept, index) => {
                const colors = ["primary", "success", "info", "warning", "danger", "secondary"];
                const color = colors[index % colors.length];
                return (
                  <div key={dept.department__name} className="flex-1" style={{ minWidth: 120 }}>
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-sm">{dept.department__name}</span>
                      <span className="text-sm fw-semibold">{dept.count}</span>
                    </div>
                    <div className="stock-meter">
                      <div
                        className={`stock-meter__fill bg-${color}`}
                        style={{
                          width: `${(dept.count / Math.max(...charts.departments.map(d => d.count))) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-muted py-3">No department data available</div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="row mt-4">
        <div className="col-md-3 col-sm-6">
          <Link to="/patients/register" className="card card-interactive h-100">
            <div className="card-body text-center">
              <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-2" style={{ width: 48, height: 48 }}>
                <i className="bi bi-person-plus text-primary fs-4"></i>
              </div>
              <h6 className="mb-0">Register Patient</h6>
              <small className="text-muted">New patient registration</small>
            </div>
          </Link>
        </div>
        <div className="col-md-3 col-sm-6">
          <Link to="/visits/register" className="card card-interactive h-100">
            <div className="card-body text-center">
              <div className="bg-success bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-2" style={{ width: 48, height: 48 }}>
                <i className="bi bi-clipboard-plus text-success fs-4"></i>
              </div>
              <h6 className="mb-0">Register Visit</h6>
              <small className="text-muted">New patient visit</small>
            </div>
          </Link>
        </div>
        <div className="col-md-3 col-sm-6">
          <Link to="/queue" className="card card-interactive h-100">
            <div className="card-body text-center">
              <div className="bg-warning bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-2" style={{ width: 48, height: 48 }}>
                <i className="bi bi-hourglass-split text-warning fs-4"></i>
              </div>
              <h6 className="mb-0">View Queue</h6>
              <small className="text-muted">Current waiting patients</small>
            </div>
          </Link>
        </div>
        <div className="col-md-3 col-sm-6">
          <Link to="/billing" className="card card-interactive h-100">
            <div className="card-body text-center">
              <div className="bg-info bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-2" style={{ width: 48, height: 48 }}>
                <i className="bi bi-receipt text-info fs-4"></i>
              </div>
              <h6 className="mb-0">Billing</h6>
              <small className="text-muted">Invoices & payments</small>
            </div>
          </Link>
        </div>
      </div>
    </>
  );
}