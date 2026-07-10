import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getReports } from "../../services/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import { formatCurrency, formatDate } from "../../utils/formatters";

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [reportType, setReportType] = useState("daily_revenue");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const reportTypes = [
    { value: "daily_revenue", label: "Daily Revenue" },
    { value: "doctor_revenue", label: "Doctor Revenue" },
    { value: "department_revenue", label: "Department Revenue" },
    { value: "patient_statistics", label: "Patient Statistics" },
    { value: "medicine_sales", label: "Medicine Sales" },
    { value: "lab_revenue", label: "Lab Revenue" },
    { value: "radiology_revenue", label: "Radiology Revenue" },
    { value: "consultation_revenue", label: "Consultation Revenue" },
  ];

  useEffect(() => {
    // Set default date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    setDateFrom(thirtyDaysAgo.toISOString().split("T")[0]);
    setDateTo(today.toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    if (dateFrom && dateTo) {
      loadReport();
    }
  }, [reportType, dateFrom, dateTo]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await getReports(reportType, { date_from: dateFrom, date_to: dateTo });
      setReportData(data);
    } catch (err) {
      toast.error(err.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  const renderReportContent = () => {
    if (!reportData || !reportData.data) {
      return <div className="text-center text-muted py-4">No data available for this report</div>;
    }

    const { data } = reportData;

    if (reportType === "patient_statistics") {
      return (
        <div className="row">
          <div className="col-md-4">
            <div className="card">
              <div className="card-body text-center">
                <div className="text-muted text-sm">Total Patients</div>
                <div className="fs-2 fw-bold">{data.total_patients || 0}</div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card">
              <div className="card-body text-center">
                <div className="text-muted text-sm">New Patients (Range)</div>
                <div className="fs-2 fw-bold text-primary">{data.new_patients_in_range || 0}</div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card">
              <div className="card-body text-center">
                <div className="text-muted text-sm">Total Visits (Range)</div>
                <div className="fs-2 fw-bold text-success">{data.total_visits_in_range || 0}</div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (Array.isArray(data)) {
      if (data.length === 0) {
        return <div className="text-center text-muted py-4">No records found</div>;
      }

      // Check if it's daily revenue (has date field)
      if (data[0]?.paid_at__date) {
        return (
          <div className="table-wrap">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th className="text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, index) => (
                    <tr key={index}>
                      <td>{formatDate(item.paid_at__date)}</td>
                      <td className="cell-numeric">{formatCurrency(item.total || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      // Doctor/Department revenue
      if (data[0]?.visit__doctor__first_name || data[0]?.visit__department__name) {
        const nameKey = Object.keys(data[0]).find(k => k.includes("name") || k.includes("first_name"));
        return (
          <div className="table-wrap">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th className="text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, index) => {
                    const name = item[nameKey] || item.visit__doctor__first_name || item.visit__department__name || "Unknown";
                    return (
                      <tr key={index}>
                        <td>{name}</td>
                        <td className="cell-numeric">{formatCurrency(item.total || 0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      // Medicine sales
      if (data[0]?.prescription__medicine__name) {
        return (
          <div className="table-wrap">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th className="text-right">Quantity Sold</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, index) => (
                    <tr key={index}>
                      <td>{item.prescription__medicine__name || "Unknown"}</td>
                      <td className="cell-numeric">{item.total_qty || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      // Generic data display
      return (
        <div className="table-wrap">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  {Object.keys(data[0]).map((key) => (
                    <th key={key}>{key.replace(/_/g, " ").toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => (
                  <tr key={index}>
                    {Object.values(item).map((val, i) => (
                      <td key={i}>
                        {typeof val === "number" && !isNaN(val) && !String(val).includes("date")
                          ? formatCurrency(val)
                          : val || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    return <div className="text-center text-muted py-4">Data format not supported</div>;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Insights</div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Generate and view financial and operational reports</p>
        </div>
        <div className="page-header__actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadReport}
          >
            <i className="bi bi-arrow-clockwise me-2"></i>
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <div className="field">
                <label className="field-label" htmlFor="report_type">
                  Report Type
                </label>
                <select
                  id="report_type"
                  className="select"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                >
                  {reportTypes.map((rt) => (
                    <option key={rt.value} value={rt.value}>
                      {rt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="col-md-3">
              <div className="field">
                <label className="field-label" htmlFor="date_from">
                  From Date
                </label>
                <input
                  id="date_from"
                  type="date"
                  className="input"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
              <div className="field">
                <label className="field-label" htmlFor="date_to">
                  To Date
                </label>
                <input
                  id="date_to"
                  type="date"
                  className="input"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button
                type="button"
                className="btn btn-primary w-100"
                onClick={loadReport}
              >
                <i className="bi bi-search me-2"></i>
                Generate
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Summary */}
      {reportData && (
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <span className="text-muted text-sm">
                {reportData.type?.replace(/_/g, " ").toUpperCase()}
              </span>
              <span className="text-muted text-sm ms-3">
                {reportData.date_from} — {reportData.date_to}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Report Content */}
      <div className="card">
        <div className="card-body">{renderReportContent()}</div>
      </div>
    </>
  );
}