import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import App from "./App.tsx";
import "./index.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

function Root() {
  if (!convex) {
    return (
      <div className="app-shell">
        <section className="page">
          <h1>1stDeal is almost live</h1>
          <p className="lede">
            Set <code>VITE_CONVEX_URL</code> on the host and rebuild. Convex is
            the live memory layer for the company brain.
          </p>
        </section>
      </div>
    );
  }

  return (
    <ConvexProvider client={convex}>
      <HashRouter>
        <App />
      </HashRouter>
    </ConvexProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
