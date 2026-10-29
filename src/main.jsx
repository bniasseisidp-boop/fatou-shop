import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import InstallAppButton from "./InstallAppButton.jsx";
const App = lazy(() => import("./App.jsx"));
const AdminPortal = lazy(() => import("./AdminPortal.jsx"));
const SuperAdminPortal = lazy(() => import("./SuperAdminPortal.jsx"));
const CustomerPortal = lazy(() => import("./CustomerPortal.jsx"));
const DriverPortal = lazy(() => import("./DriverPortal.jsx"));
import "./styles.css";
import "./admin.css";
import "./map.css";
import "./driver.css";
import "./pwa.css";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js")
      .catch((error) => console.error("Impossible d'activer le mode hors connexion Fatou Shop.", error));
  }, { once: true });
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Suspense fallback={<main className="customer-loading">Chargement…</main>}>
      {window.location.pathname.startsWith("/superadmin")
        ? <SuperAdminPortal />
        : window.location.pathname.startsWith("/admin")
        ? <AdminPortal />
        : window.location.pathname.startsWith("/client")
          ? <CustomerPortal />
          : window.location.pathname.startsWith("/driver")
            ? <DriverPortal />
            : <App />}
    </Suspense>
    <InstallAppButton />
  </React.StrictMode>,
);
