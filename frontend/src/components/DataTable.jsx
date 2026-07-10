// src/components/DataTable.jsx
import SkeletonLoader from "./SkeletonLoader.jsx";

export default function DataTable({ columns, data, loading, emptyMessage = "No records found." }) {
  if (loading) return <SkeletonLoader columns={columns.length} />;

  if (!data || data.length === 0) {
    return (
      <div className="text-center text-muted py-5">
        <i className="bi bi-inbox fs-1 d-block mb-2"></i>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead className="table-light">
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id}>
              {columns.map((col) => (
                <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}