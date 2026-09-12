import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

export function Layout({
  children,
  companyName,
}: {
  children: ReactNode;
  companyName?: string;
}) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to="/" className="wordmark">
          <span className="mark">BH</span>
          Beachhead
        </NavLink>
        <p className="company-chip">{companyName ?? "No GTM brain yet"}</p>
      </header>
      <main className="wide">{children}</main>
    </div>
  );
}
