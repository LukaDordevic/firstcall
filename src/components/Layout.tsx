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
          <span className="mark">1</span>
          1stDeal
        </NavLink>
        <p className="motto-chip">A GTM Intelligence for early Startups</p>
        <p className="company-chip">{companyName ?? "No company yet"}</p>
      </header>
      <main className="wide">{children}</main>
    </div>
  );
}
