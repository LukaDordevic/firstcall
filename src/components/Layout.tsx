import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

const links = [
  { to: "/", label: "Brain" },
  { to: "/learn", label: "Explore" },
  { to: "/qualify", label: "Qualify" },
  { to: "/roleplay", label: "Roleplay" },
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
          <span className="mark">FC</span>
          FirstCall
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
        <p className="company-chip">{companyName ?? "No company loaded"}</p>
      </header>
      <main>{children}</main>
    </div>
  );
}
