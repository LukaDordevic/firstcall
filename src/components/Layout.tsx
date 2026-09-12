import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

const links = [
  { to: "/", label: "Setup" },
  { to: "/strategy", label: "Strategy" },
  { to: "/leads", label: "Leads" },
];

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
        <nav>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) => (isActive ? "active" : undefined)}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <p className="company-chip">{companyName ?? "No GTM brain yet"}</p>
      </header>
      <main>{children}</main>
    </div>
  );
}
