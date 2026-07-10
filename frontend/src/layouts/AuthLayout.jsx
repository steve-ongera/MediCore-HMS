import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="auth-layout">
      <div className="auth-layout__brand">
        <div className="auth-layout__brand-mark">
          <div className="auth-layout__brand-logo">H</div>
          <span>Medicore HMIS</span>
        </div>

        <div className="auth-layout__brand-copy">
          <h1 className="auth-layout__brand-title">
            Complete Hospital Management
          </h1>
          <p className="auth-layout__brand-desc">
            Streamline patient registration, billing, queue management,
            consultations, lab, radiology, pharmacy, and inventory — all in one place.
          </p>
        </div>

        <div className="auth-layout__brand-foot">
          &copy; {new Date().getFullYear()} City General Hospital
        </div>
      </div>

      <div className="auth-layout__panel">
        <Outlet />
      </div>
    </div>
  );
}