import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Clock3, LogOut, MapPin, Navigation, PackageCheck, Phone, RefreshCw, ShieldCheck } from "lucide-react";
import { api } from "./adminApi.js";
import DeliveryMap from "./DeliveryMap.jsx";
import "./driver.css";
import "./map.css";

const dateTime = (value) => value
  ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value))
  : "—";

function messageFrom(error) {
  return error instanceof Error ? error.message : "Une erreur inattendue s’est produite.";
}

export default function DriverPortal() {
  const [driver, setDriver] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savingOrder, setSavingOrder] = useState(null);
  const activeDeliveryId = useMemo(
    () => dashboard?.orders.find((order) => order.status === "in_delivery")?.id || null,
    [dashboard],
  );

  async function loadDashboard() {
    try {
      const result = await api("/driver/dashboard");
      setDriver(result.driver);
      setDashboard(result);
      setError("");
    } catch (cause) {
      if (!String(cause.message).includes("Unauthenticated")) setError(messageFrom(cause));
      setDriver(null);
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = "Espace livreur — Fatou Shop";
    void loadDashboard();
  }, []);

  useEffect(() => {
    if (!driver) return undefined;
    const interval = window.setInterval(() => void loadDashboard(), 15000);
    return () => window.clearInterval(interval);
  }, [driver?.id]);

  useEffect(() => {
    if (!activeDeliveryId) return undefined;
    if (!navigator.geolocation) {
      setError("La géolocalisation n’est pas disponible sur cet appareil.");
      return undefined;
    }

    let active = true;
    let lastSentAt = 0;
    const watchId = navigator.geolocation.watchPosition(
      async ({ coords }) => {
        const now = Date.now();
        if (!active || now - lastSentAt < 10000) return;
        lastSentAt = now;
        try {
          await api("/driver/location", {
            method: "POST",
            body: { latitude: coords.latitude, longitude: coords.longitude },
          });
          if (active) {
            setDashboard((current) => current && ({
              ...current,
              location: { latitude: coords.latitude, longitude: coords.longitude, updated_at: new Date().toISOString() },
            }));
            setError("");
          }
        } catch (cause) {
          if (active) setError(messageFrom(cause));
        }
      },
      () => {
        if (active) setError("Autorisez la position GPS dans votre navigateur pour partager votre progression pendant la livraison.");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );

    return () => {
      active = false;
      navigator.geolocation.clearWatch(watchId);
    };
  }, [activeDeliveryId]);

  async function logout() {
    try {
      await api("/driver/logout", { method: "POST" });
      setDriver(null);
      setDashboard(null);
    } catch (cause) {
      setError(messageFrom(cause));
    }
  }

  async function updateOrder(order, action) {
    setSavingOrder(order.id);
    setError("");
    setNotice("");
    try {
      await api(`/driver/orders/${order.id}/${action}`, { method: "POST" });
      setNotice(action === "start" ? "Livraison commencée. Votre position est partagée avec le client." : "Commande marquée comme livrée.");
      await loadDashboard();
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setSavingOrder(null);
    }
  }

  if (loading) return <main className="driver-loading">Ouverture de l’espace livreur…</main>;
  if (!driver) return <DriverLogin onLogin={loadDashboard} initialError={error} />;

  const activeOrder = dashboard.orders.find((order) => order.status === "in_delivery");
  return (
    <main className="driver-page">
      <header className="driver-header">
        <a href="/" className="driver-back"><ArrowLeft size={16} /> Fatou Shop</a>
        <div><ShieldCheck size={16} /> Espace livreur sécurisé</div>
        <button type="button" onClick={logout}><LogOut size={15} /> Déconnexion</button>
      </header>
      <section className="driver-welcome">
        <div><span>FATOU SHOP · LIVRAISONS</span><h1>Bonjour, {driver.name}.</h1><p>Vos commandes confirmées, adresses exactes et itinéraires.</p></div>
        <button type="button" onClick={() => void loadDashboard()}><RefreshCw size={15} /> Actualiser</button>
      </section>
      {error && <p className="driver-alert" role="alert">{error}</p>}
      {notice && <p className="driver-notice" role="status"><Check size={15} /> {notice}</p>}
      {activeOrder && <div className="driver-gps-note"><Navigation size={17} /><span><strong>Suivi GPS activé pour {activeOrder.reference}.</strong> Gardez cette page ouverte et autorisez la localisation. Le partage s’arrête quand vous marquez la commande livrée.</span></div>}
      <section className="driver-orders">
        <div className="driver-section-title"><div><span>TOURNÉE DU JOUR</span><h2>Mes livraisons</h2></div><b>{dashboard.orders.length}</b></div>
        {dashboard.orders.length ? dashboard.orders.map((order) => (
          <article className="driver-order-card" key={order.id}>
            <header><div><span>{order.reference}</span><strong>{order.customer_name}</strong></div><b className={order.status === "in_delivery" ? "on-road" : ""}>{order.status === "in_delivery" ? "En livraison" : "À prendre en charge"}</b></header>
            <a className="driver-phone" href={`tel:${order.customer_phone}`}><Phone size={15} /> {order.customer_phone}</a>
            <p className="driver-address"><MapPin size={16} /><span><strong>{order.delivery_zone_name}</strong>{order.delivery_address}{order.delivery_notes && <small>Repère : {order.delivery_notes}</small>}</span></p>
            <div className="driver-order-items">{order.items.map((item) => <span key={item.id}>{item.product_name} × {item.quantity}</span>)}</div>
            {order.delivery_latitude != null && order.delivery_longitude != null && (
              <>
                {(() => {
                  const origin = order.status === "in_delivery" && dashboard.location.latitude != null
                    ? dashboard.location
                    : dashboard.store_location;
                  return (
                    <>
                      <DeliveryMap
                        storeLocation={dashboard.store_location}
                        customerLocation={{ latitude: order.delivery_latitude, longitude: order.delivery_longitude }}
                        driverLocation={order.status === "in_delivery" && dashboard.location.latitude != null
                          ? { latitude: dashboard.location.latitude, longitude: dashboard.location.longitude }
                          : null}
                      />
                      <a className="driver-route-link" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${origin.latitude}%2C${origin.longitude}%3B${order.delivery_latitude}%2C${order.delivery_longitude}`}>
                        <Navigation size={14} /> Ouvrir l’itinéraire
                      </a>
                    </>
                  );
                })()}
              </>
            )}
            {order.status === "in_delivery"
              ? <button type="button" className="driver-complete-button" disabled={savingOrder === order.id} onClick={() => void updateOrder(order, "delivered")}><PackageCheck size={16} /> {savingOrder === order.id ? "Mise à jour…" : "Confirmer la livraison"}</button>
              : <button type="button" className="driver-start-button" disabled={savingOrder === order.id} onClick={() => void updateOrder(order, "start")}><Navigation size={16} /> {savingOrder === order.id ? "Mise à jour…" : "Démarrer la livraison"}</button>}
          </article>
        )) : <div className="driver-empty"><PackageCheck size={27} /><strong>Aucune livraison assignée.</strong><span>Les nouvelles commandes confirmées apparaîtront ici.</span></div>}
      </section>
      <section className="driver-history">
        <div className="driver-section-title"><div><span>VOS LIVRAISONS TERMINÉES</span><h2>Historique</h2></div><b>{dashboard.history.length}</b></div>
        {dashboard.history.length ? dashboard.history.map((order) => (
          <article key={order.id}>
            <div><strong>{order.reference} · {order.customer_name}</strong><span>{order.delivery_zone_name} · {order.delivery_address}</span><small>Livrée le {dateTime(order.delivered_at)}</small></div>
            <span>{order.items.map((item) => `${item.product_name} × ${item.quantity}`).join(" · ")}</span>
          </article>
        )) : <p className="driver-history-empty">Vos livraisons terminées seront conservées ici.</p>}
      </section>
      <footer className="driver-footer"><Clock3 size={14} /> Actualisation automatique · suivi GPS uniquement pendant une livraison active.</footer>
    </main>
  );
}

function DriverLogin({ onLogin, initialError }) {
  const [error, setError] = useState(initialError);
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      await api("/driver/login", {
        method: "POST",
        body: { phone: form.get("phone"), password: form.get("password") },
      });
      await onLogin();
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="driver-login-page">
      <a href="/" className="driver-back"><ArrowLeft size={16} /> Retour à la boutique</a>
      <section className="driver-login-card">
        <span><ShieldCheck size={17} /> ESPACE LIVREUR</span><h1>Connexion à votre tournée.</h1>
        <p>Utilisez le numéro et le mot de passe transmis par l’administration.</p>
        <form onSubmit={(event) => void submit(event)}>
          <label>Téléphone<input name="phone" type="tel" autoComplete="username" required placeholder="77 123 45 67" /></label>
          <label>Mot de passe<input name="password" type="password" autoComplete="current-password" required /></label>
          {error && <p className="driver-alert" role="alert">{error}</p>}
          <button type="submit" className="driver-start-button" disabled={saving}>{saving ? "Connexion…" : "Ouvrir mon espace"}</button>
        </form>
      </section>
    </main>
  );
}
