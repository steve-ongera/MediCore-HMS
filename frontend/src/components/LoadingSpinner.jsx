// src/components/LoadingSpinner.jsx
export default function LoadingSpinner({ fullscreen = false, size = "md", label = "Loading..." }) {
  const spinner = (
    <div className="d-flex flex-column align-items-center justify-content-center gap-2 py-3">
      <div
        className={`spinner-border text-primary ${size === "sm" ? "spinner-border-sm" : ""}`}
        role="status"
        style={size === "lg" ? { width: "3rem", height: "3rem" } : undefined}
      >
        <span className="visually-hidden">{label}</span>
      </div>
      {size !== "sm" && <small className="text-muted">{label}</small>}
    </div>
  );

  if (!fullscreen) return spinner;

  return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{ height: "100vh", width: "100%" }}
    >
      {spinner}
    </div>
  );
}