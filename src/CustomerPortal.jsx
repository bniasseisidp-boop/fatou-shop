import { useEffect, useState } from "react";
import { ArrowLeft, Camera, Copy, LogOut, MapPin, PackageCheck, Share2, ShoppingBag, Sparkles } from "lucide-react";
import { api } from "./adminApi.js";
import DeliveryMap from "./DeliveryMap.jsx";
import "./map.css";
import "./customer.css";

const money = (value) => `${new Intl.NumberFormat("fr-FR").format(value || 0)} F CFA`;
const dateTime = (value) => value
  ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "—";
const statusNames = {
  pending: "À traiter",
  confirmed: "Confirmée",
  preparing: "En préparation",
  in_delivery: "En livraison",
  delivered: "Livrée",
  cancelled: "Annulée",
  unpaid: "Paiement à organiser",
  submitted: "Paiement à vérifier",
  verified: "Paiement validé",
  rejected: "Paiement refusé",
};

function messageFrom(error) {
  return error instanceof Error ? error.message : "Une erreur inattendue s’est produite.";
}

export default function CustomerPortal() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [photoSaving, setPhotoSaving] = useState(false);
  const [buyingAnnouncement, setBuyingAnnouncement] = useState(null);
  const [deliveryZones, setDeliveryZones] = useState([]);
  const [orderSaving, setOrderSaving] = useState(false);
  const [orderNotice, setOrderNotice] = useState("");
  const [announcementLocation, setAnnouncementLocation] = useState(null);
  const [announcementLocationConfirmed, setAnnouncementLocationConfirmed] = useState(false);
  const [trackingByOrder, setTrackingByOrder] = useState({});

  async function loadDashboard() {
    try {
      setDashboard(await api("/client/dashboard"));
      setError("");
    } catch (cause) {
      if (!String(cause.message).includes("Unauthenticated")) setError(messageFrom(cause));
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = "Mon espace client — Fatou Shop";
    loadDashboard();
  }, []);

  useEffect(() => {
    if (!dashboard?.user?.id) return undefined;
    const interval = window.setInterval(() => void loadDashboard(), 30000);
    return () => window.clearInterval(interval);
  }, [dashboard?.user?.id]);

  const trackingOrderIds = dashboard?.orders
    .filter((order) => ["confirmed", "preparing", "in_delivery"].includes(order.status) && order.driver_id)
    .map((order) => order.id) || [];
  const trackingKey = trackingOrderIds.join(",");

  useEffect(() => {
    if (!trackingKey) return undefined;
    let active = true;
    const refreshTracking = async () => {
      const results = await Promise.all(trackingOrderIds.map(async (orderId) => {
        try {
          return [orderId, await api(`/client/orders/${orderId}/tracking`)];
        } catch (cause) {
          if (active) setError(messageFrom(cause));
          return null;
        }
      }));
      if (!active) return;
      const next = Object.fromEntries(results.filter(Boolean));
      setTrackingByOrder((current) => ({ ...current, ...next }));
      setDashboard((current) => current && ({
        ...current,
        orders: current.orders.map((order) => next[order.id] ? { ...order, status: next[order.id].status } : order),
      }));
    };
    void refreshTracking();
    const interval = window.setInterval(() => void refreshTracking(), 12000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [trackingKey]);

  async function logout() {
    try {
      await api("/client/logout", { method: "POST" });
      setDashboard(null);
    } catch (cause) {
      setError(messageFrom(cause));
    }
  }

  async function uploadProfilePhoto(event) {
    const photo = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!photo || !dashboard) return;

    setPhotoSaving(true);
    setError("");
    try {
      const body = new FormData();
      body.append("photo", photo);
      const result = await api("/client/profile/photo", { method: "POST", body });
      setDashboard((current) => ({
        ...current,
        user: { ...current.user, photo_url: `${result.photo_url}?v=${Date.now()}` },
      }));
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setPhotoSaving(false);
    }
  }

  async function startAnnouncementOrder(announcement) {
    setError("");
    setOrderNotice("");
    if (!announcement.product?.in_stock) return;
    try {
      if (!deliveryZones.length) {
        const storefront = await api("/storefront");
        setDeliveryZones(storefront.delivery_zones);
      }
      setAnnouncementLocation(null);
      setAnnouncementLocationConfirmed(false);
      setBuyingAnnouncement(announcement.id);
    } catch (cause) {
      setError(messageFrom(cause));
    }
  }

  async function placeAnnouncementOrder(event, announcement) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const product = announcement.product;
    if (!product?.in_stock) {
      setError("Cet article vient d’être épuisé. Actualisez votre espace avant de réessayer.");
      await loadDashboard();
      return;
    }
    if (!announcementLocation || !announcementLocationConfirmed) {
      setError("Placez le repère et confirmez qu’il correspond à votre adresse.");
      return;
    }
    setOrderSaving(true);
    setError("");
    setOrderNotice("");
    const request = new FormData();
    request.append("customer_name", user.name);
    request.append("customer_phone", user.phone);
    request.append("delivery_zone_id", String(formData.get("delivery_zone_id") || ""));
    request.append("delivery_address", String(formData.get("delivery_address") || ""));
    request.append("delivery_latitude", String(announcementLocation.latitude));
    request.append("delivery_longitude", String(announcementLocation.longitude));
    request.append("delivery_notes", String(formData.get("delivery_notes") || ""));
    request.append("items[0][product_id]", String(product.id));
    request.append("items[0][quantity]", "1");
    try {
      const result = await api("/orders", { method: "POST", body: request });
      setBuyingAnnouncement(null);
      setOrderNotice(`Commande ${result.order.reference} enregistrée. Elle apparaîtra dans votre historique.`);
      await loadDashboard();
    } catch (cause) {
      const message = messageFrom(cause);
      await loadDashboard();
      setError(message);
    } finally {
      setOrderSaving(false);
    }
  }

  if (loading) return <main className="customer-loading">Chargement de votre espace…</main>;
  if (!dashboard) return <CustomerLogin onLogin={loadDashboard} initialError={error} />;

  const { user, metrics, orders, referral } = dashboard;
  const referralLink = `${window.location.origin}/client?ref=${encodeURIComponent(user.referral_code)}`;

  return (
    <main className="customer-page">
      <header className="customer-header">
        <a className="customer-back" href="/"><ArrowLeft size={16} /> Retour à la boutique</a>
        <button type="button" className="customer-logout" onClick={logout}><LogOut size={16} /> Déconnexion</button>
      </header>
      <section className="customer-welcome">
        <div className="customer-welcome-copy">
          <span className="customer-overline">FATOU SHOP · ESPACE CLIENT</span>
          <h1>Bonjour, <em>{user.name.split(" ")[0]}.</em></h1>
          <p>Suivez vos commandes, vos paiements et vos invitations depuis un seul endroit.</p>
        </div>
        <label className="customer-profile-photo" title="Ajouter ou modifier votre photo de profil">
          {user.photo_url
            ? <img src={user.photo_url} alt={`Photo de profil de ${user.name}`} />
            : <span>{user.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>}
          <small><Camera size={13} /> {photoSaving ? "Envoi…" : "Photo"}</small>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadProfilePhoto} disabled={photoSaving} />
        </label>
      </section>
      {error && <p className="customer-error" role="alert">{error}</p>}

      {orderNotice && <p className="customer-order-notice" role="status">{orderNotice}</p>}
      {dashboard.announcements.length > 0 && (
        <section className="customer-announcements" aria-label="Annonces de la boutique">
          <span className="customer-overline">ACTUALITÉS DE LA BOUTIQUE</span>
          {dashboard.announcements.map((announcement) => (
            <article key={announcement.id}>
              {announcement.image_url && <img className="customer-announcement-image" src={announcement.image_url} alt="" />}
              <h2>{announcement.title}</h2>
              <p>{announcement.body}</p>
              {announcement.product && (
                <div className="customer-announcement-product">
                  {announcement.product.image_url && <img src={announcement.product.image_url} alt={announcement.product.name} />}
                  <div>
                    <span>{announcement.product.category}</span>
                    <strong>{announcement.product.name}</strong>
                    <b>{money(announcement.product.price)}</b>
                    <small className={announcement.product.in_stock ? (announcement.product.low_stock ? "low" : "available") : "unavailable"}>
                      {!announcement.product.in_stock
                        ? "En rupture de stock"
                        : announcement.product.low_stock
                          ? `Stock faible · ${announcement.product.stock} restant(s)`
                          : `${announcement.product.stock} en stock`}
                    </small>
                  </div>
                  <button type="button" disabled={!announcement.product.in_stock} onClick={() => void startAnnouncementOrder(announcement)}>
                    <ShoppingBag size={14} /> Acheter
                  </button>
                </div>
              )}
              {buyingAnnouncement === announcement.id && announcement.product?.in_stock && (
                <form className="customer-announcement-order" onSubmit={(event) => void placeAnnouncementOrder(event, announcement)}>
                  <strong>Livraison de {announcement.product.name}</strong>
                  <label>Quartier de livraison
                    <select name="delivery_zone_id" required defaultValue="">
                      <option value="" disabled>Choisir votre quartier</option>
                      {deliveryZones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name} · {money(zone.fee)}</option>)}
                    </select>
                  </label>
                  <label>Adresse précise<input name="delivery_address" minLength={4} maxLength={1000} placeholder="Rue, immeuble, repère" required /></label>
                  <label>Point de repère (facultatif)<input name="delivery_notes" maxLength={1000} placeholder="Ex. près de la pharmacie…" /></label>
                  <div className="customer-delivery-map-wrap">
                    <strong>Choisir l’adresse exacte sur la carte</strong>
                    <button type="button" className="use-current-location" onClick={() => {
                      if (!navigator.geolocation) {
                        setError("La géolocalisation n’est pas disponible sur cet appareil.");
                        return;
                      }
                      navigator.geolocation.getCurrentPosition(
                        ({ coords }) => {
                          setAnnouncementLocation({ latitude: coords.latitude, longitude: coords.longitude });
                          setAnnouncementLocationConfirmed(false);
                        },
                        () => setError("Position GPS indisponible. Touchez la carte pour placer le repère."),
                        { enableHighAccuracy: true, timeout: 12000 },
                      );
                    }}><MapPin size={13} /> Utiliser ma position</button>
                    <DeliveryMap
                      storeLocation={dashboard.store_location}
                      customerLocation={announcementLocation}
                      interactive
                      onPick={(location) => {
                        setAnnouncementLocation(location);
                        setAnnouncementLocationConfirmed(false);
                      }}
                    />
                    <label className="delivery-location-confirm">
                      <input type="checkbox" checked={announcementLocationConfirmed} onChange={(event) => setAnnouncementLocationConfirmed(event.target.checked)} />
                      Je confirme que le repère indique bien mon lieu de livraison.
                    </label>
                  </div>
                  <div>
                    <button type="submit" className="customer-primary" disabled={orderSaving}>{orderSaving ? "Enregistrement…" : "Confirmer la commande"}</button>
                    <button type="button" className="customer-mode-toggle" onClick={() => setBuyingAnnouncement(null)}>Annuler</button>
                  </div>
                </form>
              )}
              <time dateTime={announcement.published_at}>{dateTime(announcement.published_at)}</time>
            </article>
          ))}
        </section>
      )}

      <section className="customer-metrics" aria-label="Résumé du compte">
        <article><span>Commandes</span><strong>{metrics.orders_count}</strong></article>
        <article><span>Total payé</span><strong>{money(metrics.amount_paid)}</strong></article>
        <article><span>Payé cette semaine</span><strong>{money(metrics.amount_paid_this_week)}</strong></article>
        <article><span>Payé ce mois</span><strong>{money(metrics.amount_paid_this_month)}</strong></article>
        <article><span>Livrées</span><strong>{metrics.orders_delivered}</strong></article>
        <article><span>En cours</span><strong>{metrics.orders_in_progress}</strong></article>
      </section>

      <section className="customer-referral">
        <div className="customer-referral-copy">
          <span className="customer-overline"><Sparkles size={14} /> PARRAINAGE</span>
          <h2>Partagez vos trouvailles.</h2>
          <p>Invitez {referral.threshold} proches. Une invitation compte quand la personne crée son compte et que sa commande est livrée. Vous recevrez ensuite {referral.discount_percent} % de réduction sur une prochaine commande.</p>
          <label className="customer-referral-code">Votre code <strong>{user.referral_code}</strong></label>
          <div className="customer-referral-actions">
            <button type="button" onClick={() => navigator.clipboard.writeText(user.referral_code)}><Copy size={15} /> Copier le code</button>
            <button type="button" onClick={() => navigator.clipboard.writeText(referralLink)}><Share2 size={15} /> Copier le lien d’invitation</button>
          </div>
        </div>
        <div className="customer-referral-count">
          <strong>{metrics.referrals_qualified}<span> / {referral.threshold}</span></strong>
          <span>invitations validées</span>
          {referral.reward_available
            ? <b>Votre réduction de {referral.discount_percent} % est disponible.</b>
            : <small>{Math.max(0, referral.threshold - metrics.referrals_qualified)} invitation(s) livrée(s) avant le prochain palier.</small>}
          <PackageCheck size={25} />
        </div>
      </section>

      <section className="customer-orders">
        <div className="customer-section-heading"><div><span className="customer-overline">VOTRE HISTORIQUE</span><h2>Mes commandes</h2></div><span>{orders.length} commande(s)</span></div>
        {orders.length ? orders.map((order) => (
          <article className="customer-order-card" key={order.id}>
            <header><div><strong>{order.reference}</strong><span>{dateTime(order.created_at)}</span></div><span className={`customer-order-status ${order.status}`}>{statusNames[order.status] || order.status}</span></header>
            <div className="customer-order-items">
              {order.items.map((item) => <span key={item.id}>{item.product_name} × {item.quantity}</span>)}
            </div>
            {order.status === "in_delivery" && trackingByOrder[order.id] && (
              <div className="customer-live-tracking">
                <div><strong>Votre livreur est en route</strong><span>{trackingByOrder[order.id].driver?.name || "Livreur"}</span>
                  {trackingByOrder[order.id].driver?.location_updated_at && <small>Position actualisée {dateTime(trackingByOrder[order.id].driver.location_updated_at)}</small>}
                  {!trackingByOrder[order.id].driver?.location && <small>En attente de la position GPS du livreur…</small>}
                </div>
                <DeliveryMap
                  storeLocation={dashboard.store_location}
                  customerLocation={trackingByOrder[order.id].customer_location}
                  driverLocation={trackingByOrder[order.id].driver?.location}
                  className="customer-tracking-map"
                />
              </div>
            )}
            {(order.payment_method || order.payer_name || order.payment_reference) && (
              <div className="customer-payment-details">
                <strong>{order.payment_method === "wave" ? "Wave" : order.payment_method === "orange_money" ? "Orange Money" : "Paiement"}</strong>
                {order.payer_name && <span>Nom du payeur : {order.payer_name}</span>}
                {order.payer_phone && <span>Numéro utilisé : {order.payer_phone}</span>}
                {order.payment_reference && <span>Référence : {order.payment_reference}</span>}
              </div>
            )}
            {order.payment_proof_url && (
              <a className="customer-proof-link" href={order.payment_proof_url} target="_blank" rel="noreferrer">
                <img src={order.payment_proof_url} alt={`Justificatif de paiement de la commande ${order.reference}`} loading="lazy" />
                <span>Voir la capture envoyée</span>
              </a>
            )}
            <footer>
              <span>{statusNames[order.payment_status] || order.payment_status}</span>
              {order.referral_discount_amount > 0 && <span>Réduction parrainage −{money(order.referral_discount_amount)}</span>}
              <strong>{money(order.total)}</strong>
            </footer>
          </article>
        )) : <p className="customer-empty">Vos commandes enregistrées apparaîtront ici.</p>}
      </section>
    </main>
  );
}

function CustomerLogin({ onLogin, initialError }) {
  const [mode, setMode] = useState("login");
  const [error, setError] = useState(initialError);
  const [saving, setSaving] = useState(false);
  const referralFromUrl = new URLSearchParams(window.location.search).get("ref") || "";

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const phone = String(form.get("phone") || "").trim();
    const password = String(form.get("password") || "");
    try {
      if (mode === "register") {
        await api("/client/register", {
          method: "POST",
          body: {
            name: String(form.get("name") || "").trim(),
            phone,
            password,
            password_confirmation: String(form.get("password_confirmation") || ""),
            referral_code: String(form.get("referral_code") || "").trim() || null,
          },
        });
      } else {
        await api("/client/login", { method: "POST", body: { phone, password } });
      }
      await onLogin();
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="customer-auth-page">
      <a className="customer-back" href="/"><ArrowLeft size={16} /> Retour à la boutique</a>
      <section className="customer-auth-card">
        <span className="customer-overline">FATOU SHOP · ESPACE CLIENT</span>
        <h1>{mode === "login" ? "Retrouvez vos commandes." : "Créez votre espace."}</h1>
        <p>Votre compte est facultatif. Il permet de suivre vos commandes, dépenses et invitations.</p>
        <form onSubmit={submit}>
          {mode === "register" && <label>Nom complet<input name="name" required minLength="2" maxLength="160" autoComplete="name" /></label>}
          <label>Téléphone sénégalais<input name="phone" type="tel" required placeholder="77 123 45 67" autoComplete="tel" /></label>
          <label>Mot de passe<input name="password" type="password" required minLength={mode === "register" ? 10 : undefined} autoComplete={mode === "register" ? "new-password" : "current-password"} /></label>
          {mode === "register" && <>
            <label>Confirmer le mot de passe<input name="password_confirmation" type="password" required minLength="10" autoComplete="new-password" /></label>
            <label>Code d’invitation (facultatif)<input name="referral_code" defaultValue={referralFromUrl} maxLength="20" /></label>
          </>}
          {error && <p className="customer-error" role="alert">{error}</p>}
          <button type="submit" className="customer-primary" disabled={saving}>{saving ? "Veuillez patienter…" : mode === "login" ? "Me connecter" : "Créer mon compte"}</button>
        </form>
        <button type="button" className="customer-mode-toggle" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
          {mode === "login" ? "Nouveau client ? Créer un compte" : "J’ai déjà un compte"}
        </button>
      </section>
    </main>
  );
}
