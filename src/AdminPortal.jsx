import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Boxes,
  Check,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  Eye,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MapPin,
  MessageCircle,
  Package,
  Pencil,
  Plus,
  Search,
  Share2,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { api } from "./adminApi.js";
import DeliveryMap from "./DeliveryMap.jsx";
import "./map.css";

const money = (value) => `${new Intl.NumberFormat("fr-FR").format(value || 0)} F CFA`;
const dateTime = (value) => value
  ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "—";

const navigation = [
  { id: "dashboard", label: "Vue d’ensemble", icon: LayoutDashboard },
  { id: "orders", label: "Commandes", icon: ClipboardList },
  { id: "products", label: "Articles", icon: Package },
  { id: "delivery", label: "Livraison", icon: MapPin },
  { id: "drivers", label: "Livreurs", icon: Package },
  { id: "referrals", label: "Clients & parrainage", icon: Users },
  { id: "settings", label: "Paramètres", icon: Settings },
];

const sectionTitles = {
  dashboard: ["Bonjour", "Voici l’activité de votre boutique."],
  orders: ["Commandes", "Consultez les demandes et contrôlez les paiements."],
  products: ["Articles", "Gérez les produits affichés dans votre vitrine."],
  delivery: ["Livraison", "Définissez les quartiers desservis et leurs tarifs."],
  drivers: ["Livreurs", "Gérez les livreurs et leurs accès sécurisés."],
  referrals: ["Clients & parrainage", "Suivez vos clients fidèles et configurez les récompenses d’invitation."],
  settings: ["Paramètres", "Les coordonnées et le contenu public de la boutique."],
};

function messageFrom(error) {
  return error instanceof Error ? error.message : "Une erreur inattendue s’est produite.";
}

function AdminPortal() {
  const [admin, setAdmin] = useState(null);
  const [brandName, setBrandName] = useState("Fatou Shop");
  const [section, setSection] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    api("/admin/me")
      .then(({ user }) => { if (active) setAdmin(user); })
      .catch((cause) => {
        if (active && !String(cause.message).includes("Unauthenticated")) setError(messageFrom(cause));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    api("/storefront")
      .then(({ settings }) => {
        if (active && settings.brand?.name) setBrandName(settings.brand.name);
      })
      .catch((cause) => {
        if (active) setError(messageFrom(cause));
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    document.title = `${brandName} — Administration`;
  }, [brandName]);

  async function logout() {
    try {
      await api("/admin/logout", { method: "POST" });
      setAdmin(null);
    } catch (cause) {
      setError(messageFrom(cause));
    }
  }

  if (loading) {
    return <main className="admin-loading"><span className="admin-spinner" /> Ouverture de l’espace sécurisé…</main>;
  }

  if (!admin) {
    return <LoginPage onLogin={setAdmin} initialError={error} brandName={brandName} />;
  }

  const [title, subtitle] = sectionTitles[section];

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/" aria-label="Retour à la vitrine">
          {brandName.toUpperCase()}<i>.</i>
          <small>ESPACE ADMIN</small>
        </a>
        <div className="admin-sidebar-label">BOUTIQUE</div>
        <nav className="admin-navigation" aria-label="Navigation admin">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button type="button" className={section === id ? "active" : ""} key={id} onClick={() => { setSection(id); setError(""); }}>
              <Icon size={18} strokeWidth={1.7} /><span>{label}</span>
              {id === "orders" && <span className="admin-nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
        {admin.is_superadmin && <a className="admin-superadmin-link" href="/superadmin"><ShieldCheck size={14} /> Contrôle superadmin</a>}
        <div className="admin-user">
            <span className="admin-user-avatar">{admin.name.slice(0, 1).toUpperCase()}</span>
            <span><strong>{admin.name}</strong><small>Administrateur</small></span>
          </div>
          <button type="button" className="admin-logout" onClick={logout}><LogOut size={16} /> Déconnexion</button>
          <a className="admin-storefront-link" href="/"><ArrowLeft size={15} /> Retour à la vitrine</a>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div><span className="admin-overline">{brandName.toUpperCase()} · GESTION</span><h1>{title}</h1><p>{subtitle}</p></div>
          <a href="/" className="admin-view-store">Voir la vitrine <ArrowUpRight size={16} /></a>
        </header>
        {error && <div className="admin-alert" role="alert">{error}<button type="button" onClick={() => setError("")}><X size={15} /></button></div>}
        <div className="admin-content" key={`${section}-${revision}`}>
          {section === "dashboard" && <DashboardSection onNavigate={setSection} />}
          {section === "orders" && <OrdersSection onChanged={() => setRevision((value) => value + 1)} />}
          {section === "products" && <ProductsSection onChanged={() => setRevision((value) => value + 1)} />}
          {section === "delivery" && <DeliverySection onChanged={() => setRevision((value) => value + 1)} />}
          {section === "drivers" && <DriversSection />}
          {section === "referrals" && <ReferralsSection />}
          {section === "settings" && <SettingsSection onSaved={(name) => { setBrandName(name); setRevision((value) => value + 1); }} />}
        </div>
        <footer className="admin-footer"><ShieldCheck size={14} /> Connexion protégée · {brandName}</footer>
      </main>
    </div>
  );
}

function LoginPage({ onLogin, initialError, brandName }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const { user } = await api("/admin/login", {
        method: "POST",
        body: { email, password },
      });
      onLogin(user);
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="admin-login-page">
      <a className="login-back" href="/"><ArrowLeft size={15} /> Retour à la vitrine</a>
      <section className="admin-login-card">
        <a className="admin-brand login-brand" href="/">{brandName.toUpperCase()}<i>.</i><small>ESPACE ADMIN</small></a>
        <span className="login-kicker"><ShieldCheck size={14} /> CONNEXION SÉCURISÉE</span>
        <h1>Ravie de vous<br /><em>retrouver.</em></h1>
        <p>Connectez-vous pour gérer la boutique et ses commandes.</p>
        <form onSubmit={submit}>
          <label>E-mail administrateur<input autoComplete="username" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Mot de passe<input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {error && <div className="admin-alert" role="alert">{error}</div>}
          <button type="submit" className="admin-primary-button" disabled={submitting}>{submitting ? "Connexion…" : "Ouvrir mon espace"} <ArrowUpRight size={17} /></button>
        </form>
        <small className="login-security-note">Accès réservé à l’administrateur. Aucun compte public ne peut accéder à cet espace.</small>
      </section>
    </main>
  );
}

function DashboardSection({ onNavigate }) {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api("/admin/dashboard").then(setDashboard).catch((cause) => setError(messageFrom(cause)));
  }, []);
  if (error) return <SectionError error={error} />;
  if (!dashboard) return <SectionLoading />;

  const { metrics, recent_orders: orders, best_customers: customers, best_products: products } = dashboard;
  const cards = [
    { label: "Chiffre confirmé", value: money(metrics.revenue_verified), note: `${money(metrics.revenue_this_month)} ce mois-ci`, icon: CircleDollarSign, tone: "pink" },
    { label: "Commandes reçues", value: metrics.orders_total, note: `${metrics.orders_pending} à traiter`, icon: ShoppingBag, tone: "dark" },
    { label: "Paiements à vérifier", value: metrics.payments_to_review, note: `${metrics.payments_verified} validés`, icon: BadgeCheck, tone: "peach" },
    { label: "Commandes livrées", value: metrics.orders_delivered, note: "Depuis l’ouverture", icon: Boxes, tone: "green" },
  ];

  return (
    <div className="admin-dashboard">
      <div className="admin-metric-grid">
        {cards.map(({ label, value, note, icon: Icon, tone }) => (
          <article className="admin-metric-card" key={label}>
            <span className={`metric-icon ${tone}`}><Icon size={19} /></span>
            <span className="metric-label">{label}</span><strong>{value}</strong><small>{note}</small>
          </article>
        ))}
      </div>
      <div className="admin-dashboard-columns">
        <section className="admin-panel recent-orders">
          <div className="admin-panel-head"><div><h2>Dernières commandes</h2><p>Les dernières demandes de la vitrine</p></div><button type="button" onClick={() => onNavigate("orders")}>Tout voir <ArrowUpRight size={15} /></button></div>
          <OrderTable orders={orders} compact onOpen={() => onNavigate("orders")} />
        </section>
        <section className="admin-panel top-products">
          <div className="admin-panel-head"><div><h2>Articles populaires</h2><p>Ventes dont le paiement est validé</p></div><Package size={18} /></div>
          {products.length ? products.map((product, index) => (
            <div className="ranking-row" key={product.product_name}><span className="ranking-number">0{index + 1}</span><span className="ranking-name">{product.product_name}</span><span className="ranking-quantity">{product.quantity_sold} vendus</span></div>
          )) : <EmptyState text="Les ventes apparaîtront après validation des paiements." />}
        </section>
      </div>
      <section className="admin-panel customer-panel">
        <div className="admin-panel-head"><div><h2>Meilleurs clients</h2><p>Calculés sur les commandes dont le paiement est validé</p></div></div>
        {customers.length ? <div className="admin-client-list">{customers.map((customer, index) => (
          <div className="admin-client-row" key={customer.customer_phone}><span className="ranking-number">0{index + 1}</span><strong>{customer.customer_name}</strong><span>{customer.customer_phone}</span><span>{customer.orders_count} commande(s)</span><b>{money(customer.spent)}</b></div>
        ))}</div> : <EmptyState text="Les meilleurs clients apparaîtront après les premières ventes validées." />}
      </section>
    </div>
  );
}

function OrdersSection({ onChanged }) {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [payment, setPayment] = useState("");
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page) });
    if (search.trim()) params.set("search", search.trim());
    if (status) params.set("status", status);
    if (payment) params.set("payment_status", payment);
    api(`/admin/orders?${params}`).then((result) => setOrders(result.data)).catch((cause) => setError(messageFrom(cause)));
  }, [search, status, payment, page]);

  async function openOrder(order) {
    try {
      const result = await api(`/admin/orders/${order.id}`);
      setSelected(result.order);
      setSelectedProof(result.proof_url);
      setStoreLocation(result.store_location);
    } catch (cause) {
      setError(messageFrom(cause));
    }
  }

  const [selectedProof, setSelectedProof] = useState(null);
  const [storeLocation, setStoreLocation] = useState(null);
  useEffect(() => {
    if (!selected) return undefined;
    const interval = window.setInterval(async () => {
      try {
        const result = await api(`/admin/orders/${selected.id}`);
        setSelected(result.order);
        setStoreLocation(result.store_location);
      } catch (cause) {
        setError(messageFrom(cause));
      }
    }, 15000);
    return () => window.clearInterval(interval);
  }, [selected?.id]);
  async function updateOrder(values) {
    try {
      await api(`/admin/orders/${selected.id}`, { method: "PATCH", body: values });
      await openOrder(selected);
      onChanged();
      setError("");
    } catch (cause) {
      setError(messageFrom(cause));
      throw cause;
    }
  }

  async function deleteOrder(order) {
    if (!window.confirm(`Supprimer définitivement la commande ${order.reference} ? Cette action est irréversible.`)) return;

    try {
      await api(`/admin/orders/${order.id}`, { method: "DELETE" });
      setOrders((current) => current.filter((item) => item.id !== order.id));
      setSelected(null);
      setSelectedProof(null);
      onChanged();
      setError("");
    } catch (cause) {
      setError(messageFrom(cause));
    }
  }

  return (
    <section className="admin-panel">
      {error && <div className="admin-alert" role="alert">{error}<button type="button" onClick={() => setError("")}><X size={15} /></button></div>}
      <div className="admin-toolbar">
        <label className="admin-search"><Search size={16} /><input placeholder="Nom, téléphone ou référence…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label>
        <select aria-label="Filtrer par statut de commande" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Tous les statuts</option><option value="pending">À traiter</option><option value="confirmed">Confirmée</option><option value="preparing">Préparation</option><option value="in_delivery">En livraison</option><option value="delivered">Livrée</option><option value="cancelled">Annulée</option></select>
        <select aria-label="Filtrer par paiement" value={payment} onChange={(event) => setPayment(event.target.value)}><option value="">Tous les paiements</option><option value="unpaid">Non payé</option><option value="submitted">À vérifier</option><option value="verified">Validé</option><option value="rejected">Refusé</option></select>
      </div>
      <OrderTable orders={orders} onOpen={openOrder} onDelete={deleteOrder} />
      {orders.length === 0 && <EmptyState text="Aucune commande ne correspond à ces filtres." />}
      {selected && <OrderDetails order={selected} proofUrl={selectedProof} storeLocation={storeLocation} onClose={() => setSelected(null)} onSave={updateOrder} />}
    </section>
  );
}

function OrderTable({ orders, onOpen, onDelete, compact = false }) {
  if (!orders?.length) return <EmptyState text="Aucune commande pour le moment." />;
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead><tr><th>Référence</th><th>Client</th><th>Quartier</th><th>Total</th><th>Paiement</th><th>Commande</th>{!compact && <th />}</tr></thead>
        <tbody>{orders.map((order) => (
          <tr key={order.id} onClick={() => onOpen?.(order)}>
            <td><strong className="order-reference">{order.reference}</strong><small>{dateTime(order.created_at)}</small></td>
            <td><strong>{order.customer_name}</strong><small>{order.customer_phone}</small></td>
            <td>{order.delivery_zone_name}</td><td className="table-price">{money(order.total)}</td>
            <td><StatusPill value={order.payment_status} kind="payment" /></td>
            <td><StatusPill value={order.status} kind="order" /></td>
            {!compact && <td><div className="order-row-actions"><button className="table-icon-button" type="button" aria-label={`Voir ${order.reference}`} onClick={(event) => { event.stopPropagation(); onOpen?.(order); }}><Eye size={16} /></button><button className="table-icon-button danger" type="button" aria-label={`Supprimer la commande ${order.reference}`} onClick={(event) => { event.stopPropagation(); onDelete?.(order); }}><Trash2 size={15} /></button></div></td>}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function OrderDetails({ order, proofUrl, storeLocation, onClose, onSave }) {
  const [status, setStatus] = useState(order.status);
  const [payment, setPayment] = useState(order.payment_status);
  const [notes, setNotes] = useState(order.admin_notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    try {
      await onSave({ status, payment_status: payment, admin_notes: notes });
      onClose();
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="admin-order-detail" role="dialog" aria-modal="true" aria-labelledby="order-detail-title">
        <header className="admin-modal-head"><div><span className="admin-overline">COMMANDE CLIENT</span><h2 id="order-detail-title">{order.reference}</h2></div><button type="button" aria-label="Fermer" onClick={onClose}><X size={19} /></button></header>
        {error && <div className="admin-alert" role="alert">{error}</div>}
        <div className="order-detail-columns">
          <div>
            <DetailBlock title="Coordonnées"><strong>{order.customer_name}</strong><a href={`tel:${order.customer_phone}`}>{order.customer_phone}</a>{order.customer_email && <span>{order.customer_email}</span>}</DetailBlock>
            <DetailBlock title="Livraison"><strong>{order.delivery_zone_name}</strong><span>{order.delivery_address}</span>{order.delivery_notes && <span>Repère : {order.delivery_notes}</span>}
              {order.delivery_latitude != null && order.delivery_longitude != null && <DeliveryMap
                storeLocation={storeLocation}
                customerLocation={{ latitude: order.delivery_latitude, longitude: order.delivery_longitude }}
                driverLocation={order.status === "in_delivery" && order.driver?.current_latitude != null
                  ? { latitude: order.driver.current_latitude, longitude: order.driver.current_longitude }
                  : null}
                className="order-map"
              />}
              {order.driver && <span>Livreur assigné : {order.driver.name} · {order.driver.phone}</span>}
              {!order.driver && ["confirmed", "preparing", "in_delivery"].includes(order.status) && <span className="driver-unassigned">Aucun livreur disponible pour le moment.</span>}
            </DetailBlock>
            <DetailBlock title="Articles">{order.items?.map((item) => <div className="detail-item" key={item.id}><span>{item.product_name} × {item.quantity}</span><strong>{money(item.line_total)}</strong></div>)}</DetailBlock>
            <div className="detail-total"><span>Sous-total</span><strong>{money(order.subtotal)}</strong><span>Livraison</span><strong>{money(order.delivery_fee)}</strong><b>Total</b><b>{money(order.total)}</b></div>
          </div>
          <div>
            <DetailBlock title="Paiement"><span>Moyen : {order.payment_method === "orange_money" ? "Orange Money" : order.payment_method || "À confirmer"}</span><span>Nom du payeur : {order.payer_name || "—"}</span><span>Téléphone : {order.payer_phone || "—"}</span><span>Référence : {order.payment_reference || "—"}</span>
              {proofUrl ? <div className="payment-proof-preview">
                <a className="proof-link" href={proofUrl} target="_blank" rel="noreferrer"><Eye size={15} /> Ouvrir le justificatif</a>
                <img src={proofUrl} alt={`Justificatif de paiement de la commande ${order.reference}`} />
                <a className="proof-link" href={`${proofUrl}?download=1`}><Upload size={15} /> Télécharger le justificatif</a>
              </div> : <span>Aucun justificatif joint.</span>}
            </DetailBlock>
            <DetailBlock title="Validation et suivi">
              <label className="admin-field">Paiement<select value={payment} onChange={(event) => setPayment(event.target.value)}><option value="unpaid">Non payé</option><option value="submitted">À vérifier</option><option value="verified">Validé</option><option value="rejected">Refusé</option></select></label>
              <label className="admin-field">Commande<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="pending">À traiter</option><option value="confirmed">Confirmée</option><option value="preparing">Préparation</option><option value="in_delivery">En livraison</option><option value="delivered">Livrée</option><option value="cancelled">Annulée</option></select></label>
              <label className="admin-field">Note interne<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows="3" maxLength="3000" /></label>
              <button type="button" className="admin-primary-button" onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer les changements"} <Check size={16} /></button>
            </DetailBlock>
          </div>
        </div>
      </section>
    </div>
  );
}

function DetailBlock({ title, children }) {
  return <section className="detail-block"><h3>{title}</h3>{children}</section>;
}

function ProductsSection({ onChanged }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(undefined);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
    api(`/admin/products${query}`).then(({ data }) => setProducts(data)).catch((cause) => setError(messageFrom(cause)));
  }, [search, revision]);

  async function saveProduct(data) {
    try {
      if (data.id) {
        data.form.append("_method", "PUT");
        await api(`/admin/products/${data.id}`, { method: "POST", body: data.form });
      } else {
        await api("/admin/products", { method: "POST", body: data.form });
      }
      setEditing(undefined);
      setRevision((value) => value + 1);
      onChanged();
    } catch (cause) {
      throw new Error(messageFrom(cause));
    }
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Supprimer « ${product.name} » ?`)) return;
    try {
      await api(`/admin/products/${product.id}`, { method: "DELETE" });
      setRevision((value) => value + 1);
      onChanged();
    } catch (cause) {
      setError(messageFrom(cause));
    }
  }

  return (
    <section className="admin-panel">
      {error && <div className="admin-alert" role="alert">{error}</div>}
      <div className="admin-toolbar">
        <label className="admin-search"><Search size={16} /><input placeholder="Rechercher un article…" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <button type="button" className="admin-primary-button" onClick={() => setEditing(null)}><Plus size={16} /> Ajouter un article</button>
      </div>
      <div className="admin-product-grid">
        {products.map((product) => (
          <article className="admin-product-card" key={product.id}>
            <div className="admin-product-photo">{product.image_url ? <img src={product.image_url} alt={product.image_alt || product.name} /> : <ImagePlus size={25} />}
              <StatusPill value={product.active ? "Actif" : "Masqué"} kind={product.active ? "active" : "inactive"} />
            </div>
            <div className="admin-product-info"><span>{product.category}</span><h3>{product.name}</h3><div className="admin-product-prices"><strong>{money(product.price)}</strong>{product.old_price && <s>{money(product.old_price)}</s>}</div>
              <small className={`admin-stock-status ${product.stock_status || ""}`}>
                {product.stock_status === "out_of_stock" ? "Rupture de stock" : product.stock_status === "low_stock" ? `Stock faible : ${product.stock} restant(s)` : `${product.stock} en stock`}
                {" · Modifié "}{dateTime(product.updated_at)}
              </small>
            </div>
            <div className="admin-product-actions"><button type="button" onClick={() => setEditing(product)}><Pencil size={14} /> Modifier</button><button type="button" className="danger" onClick={() => deleteProduct(product)} aria-label={`Supprimer ${product.name}`}><Trash2 size={15} /></button></div>
          </article>
        ))}
      </div>
      {!products.length && <EmptyState text="Aucun article trouvé." />}
      {editing !== undefined && <ProductEditor product={editing} onClose={() => setEditing(undefined)} onSave={saveProduct} />}
    </section>
  );
}

function ProductEditor({ product, onClose, onSave }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    form.set("active", event.currentTarget.elements.active.checked ? "1" : "0");
    try {
      await onSave({ id: product?.id, form });
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="admin-editor-modal" role="dialog" aria-modal="true" aria-labelledby="product-editor-title">
        <header className="admin-modal-head"><div><span className="admin-overline">CATALOGUE</span><h2 id="product-editor-title">{product ? "Modifier l’article" : "Nouvel article"}</h2></div><button type="button" aria-label="Fermer" onClick={onClose}><X size={19} /></button></header>
        <form className="admin-editor-form" onSubmit={submit}>
          <label className="admin-field">Nom de l’article<input name="name" defaultValue={product?.name || ""} required maxLength="180" /></label>
          <div className="admin-form-row"><label className="admin-field">Catégorie<input name="category" defaultValue={product?.category || "Accessoires"} required maxLength="80" /></label><label className="admin-field">Prix (F CFA)<input name="price" type="number" min="0" defaultValue={product?.price || ""} required /></label></div>
          <div className="admin-form-row"><label className="admin-field">Ancien prix<input name="old_price" type="number" min="0" defaultValue={product?.old_price || ""} /></label><label className="admin-field">Stock<input name="stock" type="number" min="0" defaultValue={product?.stock ?? 0} required /></label></div>
          <label className="admin-field">Description<textarea name="description" rows="3" defaultValue={product?.description || ""} required maxLength="3000" /></label>
          <label className="admin-field">Étiquette<input name="label" defaultValue={product?.label || ""} maxLength="100" placeholder="Ex. Nouveau" /></label>
          <label className="admin-field">Photo de l’article<input name="image" type="file" accept="image/jpeg,image/png,image/webp" required={!product} /><small>JPG, PNG ou WEBP, 5 Mo maximum. Les justificatifs restent privés.</small></label>
          <label className="admin-check"><input name="active" type="checkbox" defaultChecked={product?.active ?? true} /> Afficher sur la vitrine</label>
          {error && <div className="admin-alert" role="alert">{error}</div>}
          <button className="admin-primary-button" type="submit" disabled={saving}><Upload size={15} />{saving ? "Enregistrement…" : "Enregistrer l’article"}</button>
        </form>
      </section>
    </div>
  );
}

function DeliverySection({ onChanged }) {
  const [zones, setZones] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFee, setNewFee] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => { api("/admin/delivery-zones").then(({ delivery_zones }) => setZones(delivery_zones)).catch((cause) => setError(messageFrom(cause))); }, [revision]);

  async function updateZone(zone, changes) {
    try {
      await api(`/admin/delivery-zones/${zone.id}`, { method: "PUT", body: { name: zone.name, fee: zone.fee, active: zone.active, ...changes } });
      setRevision((value) => value + 1);
      onChanged();
    } catch (cause) {
      setError(messageFrom(cause));
    }
  }

  async function addZone(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api("/admin/delivery-zones", { method: "POST", body: { name: newName, fee: Number(newFee), active: true } });
      setNewName("");
      setNewFee("");
      setRevision((value) => value + 1);
      onChanged();
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setSaving(false);
    }
  }

  async function removeZone(zone) {
    if (!window.confirm(`Supprimer la zone « ${zone.name} » ? Les commandes existantes conserveront son nom.`)) return;
    try {
      await api(`/admin/delivery-zones/${zone.id}`, { method: "DELETE" });
      setRevision((value) => value + 1);
      onChanged();
    } catch (cause) {
      setError(messageFrom(cause));
    }
  }

  return (
    <div className="admin-delivery-layout">
      <section className="admin-panel">
        <div className="admin-panel-head"><div><h2>Zones de livraison</h2><p>Les zones actives sont proposées dans le formulaire client.</p></div><MapPin size={19} /></div>
        {error && <div className="admin-alert" role="alert">{error}</div>}
        <div className="admin-zone-list">{zones.map((zone) => (
          <div className="admin-zone-row" key={zone.id}>
            <span className="zone-pin"><MapPin size={16} /></span><strong>{zone.name}</strong>
            <label className="zone-fee"><input type="number" min="0" value={zone.fee} aria-label={`Tarif ${zone.name}`} onChange={(event) => setZones((current) => current.map((item) => item.id === zone.id ? { ...item, fee: event.target.value } : item))} onBlur={(event) => { if (Number(event.target.value) !== zone.fee) updateZone(zone, { fee: Number(event.target.value) }); }} /> F CFA</label>
            <label className="admin-switch" title={zone.active ? "Zone active" : "Zone masquée"}><input type="checkbox" checked={zone.active} onChange={(event) => updateZone(zone, { active: event.target.checked })} /><span /></label>
            <button type="button" className="table-icon-button danger" onClick={() => removeZone(zone)} aria-label={`Supprimer ${zone.name}`}><Trash2 size={15} /></button>
          </div>
        ))}</div>
      </section>
      <section className="admin-panel">
        <div className="admin-panel-head"><div><h2>Ajouter un quartier</h2><p>Définissez le tarif en F CFA.</p></div><Plus size={19} /></div>
        <form className="admin-editor-form" onSubmit={addZone}>
          <label className="admin-field">Nom du quartier<input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Ex. Yoff" required maxLength="120" /></label>
          <label className="admin-field">Frais de livraison<input type="number" min="0" value={newFee} onChange={(event) => setNewFee(event.target.value)} placeholder="2500" required /></label>
          <button type="submit" className="admin-primary-button" disabled={saving}>{saving ? "Ajout…" : "Ajouter la zone"} <Plus size={16} /></button>
        </form>
      </section>
    </div>
  );
}

function SettingsSection({ onSaved }) {
  const [settings, setSettings] = useState(null);
  const [storeLocation, setStoreLocation] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    api("/admin/settings")
      .then((result) => {
        setSettings(result);
        setStoreLocation(result.store_location);
      })
      .catch((cause) => setError(messageFrom(cause)));
  }, []);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    const form = new FormData(event.currentTarget);
    const body = { brand: {}, story: {}, store_location: {} };
    for (const [key, value] of form.entries()) {
      const [group, name] = key.split(".");
      body[group][name] = value;
    }
    try {
      const result = await api("/admin/settings", { method: "PUT", body });
      setSettings(result);
      setStoreLocation(result.store_location);
      setNotice("Les informations de la vitrine ont été mises à jour.");
      onSaved(result.brand.name);
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setSaving(false);
    }
  }

  if (error && !settings) return <SectionError error={error} />;
  if (!settings) return <SectionLoading />;

  return (
    <form className="admin-settings-form" onSubmit={submit}>
      <section className="admin-panel">
        <div className="admin-panel-head"><div><h2>Identité et contact</h2><p>Ces coordonnées sont utilisées dans toute la vitrine.</p></div><Settings size={19} /></div>
        <div className="admin-settings-grid">
          <label className="admin-field">Nom de la boutique<input name="brand.name" defaultValue={settings.brand.name} required maxLength="120" /></label>
          <label className="admin-field">E-mail public<input name="brand.email" type="email" defaultValue={settings.brand.email} required maxLength="255" /></label>
          <label className="admin-field">Téléphone WhatsApp<input name="brand.phone" defaultValue={settings.brand.phone} required placeholder="221777364427" /></label>
          <label className="admin-field">Adresse de la boutique<input name="brand.origin" defaultValue={settings.brand.origin} required maxLength="180" /></label>
          <label className="admin-field full">Phrase de présentation<input name="brand.tagline" defaultValue={settings.brand.tagline} required maxLength="160" /></label>
        </div>
      </section>
      <section className="admin-panel">
        <div className="admin-panel-head"><div><h2>Position de la boutique</h2><p>Le repère actuel est approximatif pour Dieuppeul-Derklé. Cliquez sur la carte pour placer l’adresse exacte.</p></div><MapPin size={19} /></div>
        {storeLocation && <>
          <DeliveryMap storeLocation={storeLocation} customerLocation={storeLocation} interactive onPick={setStoreLocation} className="admin-store-map" />
          <div className="admin-settings-grid admin-map-coordinates">
            <label className="admin-field">Latitude<input type="number" step="0.0000001" value={storeLocation.latitude} onChange={(event) => setStoreLocation((current) => ({ ...current, latitude: Number(event.target.value) }))} required /></label>
            <label className="admin-field">Longitude<input type="number" step="0.0000001" value={storeLocation.longitude} onChange={(event) => setStoreLocation((current) => ({ ...current, longitude: Number(event.target.value) }))} required /></label>
            <input type="hidden" name="store_location.latitude" value={storeLocation.latitude} />
            <input type="hidden" name="store_location.longitude" value={storeLocation.longitude} />
          </div>
        </>}
      </section>
      <section className="admin-panel">
        <div className="admin-panel-head"><div><h2>Histoire de la boutique</h2><p>Texte affiché dans la présentation de Fatou.</p></div><Pencil size={18} /></div>
        <div className="admin-settings-grid">
          <label className="admin-field full">Titre<input name="story.headline" defaultValue={settings.story.headline} required maxLength="180" /></label>
          <label className="admin-field full">Accroche<textarea name="story.short" rows="2" defaultValue={settings.story.short} required maxLength="500" /></label>
          <label className="admin-field full">Présentation<textarea name="story.description" rows="4" defaultValue={settings.story.description} required maxLength="2000" /></label>
        </div>
      </section>
      {error && <div className="admin-alert" role="alert">{error}</div>}
      {notice && <div className="admin-success" role="status"><Check size={15} /> {notice}</div>}
      <button className="admin-primary-button settings-save" type="submit" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer les paramètres"} <Check size={16} /></button>
    </form>
  );
}

function DriversSection() {
  const [drivers, setDrivers] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  async function load() {
    try {
      const result = await api("/admin/drivers");
      setDrivers(result.drivers);
      setError("");
    } catch (cause) {
      setError(messageFrom(cause));
    }
  }

  useEffect(() => { void load(); }, []);

  async function create(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await api("/admin/drivers", {
        method: "POST",
        body: {
          name: data.get("name"),
          phone: data.get("phone"),
          password: data.get("password"),
        },
      });
      form.reset();
      setNotice(`Compte livreur créé pour ${result.driver.name}. Communiquez-lui le numéro et le mot de passe choisis.`);
      await load();
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setSaving(false);
    }
  }

  async function toggle(driver) {
    try {
      await api(`/admin/drivers/${driver.id}`, { method: "PATCH", body: { active: !driver.active } });
      await load();
    } catch (cause) {
      setError(messageFrom(cause));
    }
  }

  async function remove(driver) {
    if (!window.confirm(`Supprimer le compte livreur de ${driver.name} ?`)) return;
    try {
      await api(`/admin/drivers/${driver.id}`, { method: "DELETE" });
      await load();
    } catch (cause) {
      setError(messageFrom(cause));
    }
  }

  return (
    <div className="admin-driver-layout">
      {error && <div className="admin-alert" role="alert">{error}</div>}
      {notice && <div className="admin-success" role="status"><Check size={15} /> {notice}</div>}
      <section className="admin-panel">
        <div className="admin-panel-head"><div><h2>Équipe de livraison</h2><p>À la confirmation payée, chaque commande est affectée au premier livreur actif sans livraison assignée.</p></div><Users size={19} /></div>
        <div className="admin-driver-list">{drivers.map((driver) => (
          <article className="admin-driver-row" key={driver.id}>
            <div><strong>{driver.name}</strong><span>{driver.phone}</span><small>{driver.active_deliveries_count ? `${driver.active_deliveries_count} livraison(s) assignée(s)` : "Disponible"}{driver.location_updated_at ? ` · Position reçue ${dateTime(driver.location_updated_at)}` : ""}</small></div>
            {driver.current_latitude != null && driver.current_longitude != null && <DeliveryMap driverLocation={{ latitude: driver.current_latitude, longitude: driver.current_longitude }} className="admin-driver-map" />}
            <label className="admin-switch" title={driver.active ? "Actif" : "Désactivé"}><input type="checkbox" checked={driver.active} onChange={() => void toggle(driver)} /><span /></label>
            <button type="button" className="admin-customer-delete" onClick={() => void remove(driver)} aria-label={`Supprimer ${driver.name}`}><Trash2 size={15} /></button>
          </article>
        ))}</div>
        {!drivers.length && <EmptyState text="Aucun livreur ajouté." />}
      </section>
      <section className="admin-panel">
        <div className="admin-panel-head"><div><h2>Ajouter un livreur</h2><p>Choisissez un mot de passe d’au moins 10 caractères à transmettre au livreur.</p></div><Plus size={19} /></div>
        <form className="admin-editor-form" onSubmit={(event) => void create(event)}>
          <label className="admin-field">Nom complet<input name="name" minLength="2" maxLength="160" required /></label>
          <label className="admin-field">Téléphone sénégalais<input name="phone" type="tel" placeholder="77 123 45 67" required /></label>
          <label className="admin-field">Mot de passe temporaire<input name="password" type="password" minLength="10" autoComplete="new-password" required /></label>
          <button type="submit" className="admin-primary-button" disabled={saving}>{saving ? "Création…" : "Créer le compte livreur"} <Plus size={16} /></button>
        </form>
      </section>
    </div>
  );
}

function ReferralsSection() {
  const [data, setData] = useState(null);
  const [threshold, setThreshold] = useState(5);
  const [discountPercent, setDiscountPercent] = useState(5);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    try {
      const result = await api("/admin/referrals");
      setData(result);
      setThreshold(result.settings.threshold);
      setDiscountPercent(result.settings.discount_percent);
      setError("");
    } catch (cause) {
      setError(messageFrom(cause));
    }
  }

  useEffect(() => { load(); }, []);

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await api("/admin/referrals", {
        method: "PUT",
        body: { threshold: Number(threshold), discount_percent: Number(discountPercent) },
      });
      setData(result);
      setThreshold(result.settings.threshold);
      setDiscountPercent(result.settings.discount_percent);
      setNotice("Les règles de parrainage ont été enregistrées.");
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setSaving(false);
    }
  }

  if (!data && error) return <SectionError error={error} />;
  if (!data) return <SectionLoading />;

  return (
    <div className="admin-referrals">
      {error && <div className="admin-alert" role="alert">{error}</div>}
      <div className="admin-metric-grid">
        <ReferralMetric label="Comptes clients" value={data.metrics.customers_count} note="Clients inscrits" icon={Users} tone="pink" />
        <ReferralMetric label="Filleuls livrés" value={data.metrics.referrals_qualified} note="Parrainages validés" icon={Package} tone="dark" />
        <ReferralMetric label="Réductions à utiliser" value={data.metrics.rewards_available} note="Récompenses gagnées" icon={BadgeCheck} tone="green" />
      </div>
      <section className="admin-panel">
        <div className="admin-panel-head"><div><h2>Règle de parrainage</h2><p>Une remise unique sur la prochaine commande après le seuil de filleuls livrés.</p></div><Users size={19} /></div>
        <form className="admin-referral-settings" onSubmit={save}>
          <label className="admin-field">Filleuls à valider<input type="number" min="1" max="1000" value={threshold} onChange={(event) => setThreshold(event.target.value)} required /></label>
          <label className="admin-field">Remise sur la prochaine commande (%)<input type="number" min="1" max="100" value={discountPercent} onChange={(event) => setDiscountPercent(event.target.value)} required /></label>
          <button type="submit" className="admin-primary-button" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer la règle"} <Check size={15} /></button>
        </form>
        {notice && <div className="admin-success" role="status"><Check size={15} /> {notice}</div>}
      </section>
      <div className="admin-referral-rankings">
        <RankingTable title="Clients qui dépensent le plus" rows={data.top_customers} value={(customer) => money(customer.amount_paid)} empty="Les ventes apparaîtront après validation des paiements." />
        <RankingTable title="Clients qui invitent le plus" rows={data.top_invites} value={(customer) => `${customer.referrals_total} invitation(s) · ${customer.referrals_qualified} livrée(s)`} empty="Les invitations apparaîtront ici quand les clients créeront leur compte." />
      </div>
      <CustomerManagementPanel onCustomersChanged={load} />
    </div>
  );
}

function CustomerManagementPanel({ onCustomersChanged }) {
  const [customersPage, setCustomersPage] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [publishAnnouncement, setPublishAnnouncement] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadCustomers(page = 1, term = search) {
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (term.trim()) params.set("search", term.trim());
      setCustomersPage(await api(`/admin/customers?${params.toString()}`));
      setError("");
    } catch (cause) {
      setError(messageFrom(cause));
    }
  }

  async function loadAnnouncements() {
    try {
      const result = await api("/admin/announcements");
      setAnnouncements(result.announcements);
    } catch (cause) {
      setError(messageFrom(cause));
    }
  }

  async function loadAnnouncementProducts() {
    try {
      const result = await api("/admin/products?per_page=100");
      setProducts(result.data.filter((product) => product.active));
    } catch (cause) {
      setError(messageFrom(cause));
    }
  }

  async function copyProductLink(product) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/#product-${product.id}`);
      setNotice(`Lien boutique copié pour ${product.name}.`);
      setError("");
    } catch (cause) {
      setError(messageFrom(cause));
    }
  }

  useEffect(() => {
    void loadCustomers(1, "");
    void loadAnnouncements();
    void loadAnnouncementProducts();
  }, []);

  async function createAnnouncement(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const formData = new FormData(form);
      formData.set("title", announcementTitle);
      formData.set("body", announcementBody);
      formData.set("published", publishAnnouncement ? "1" : "0");
      await api("/admin/announcements", { method: "POST", body: formData });
      setAnnouncementTitle("");
      setAnnouncementBody("");
      form.reset();
      setNotice(publishAnnouncement ? "Annonce publiée dans l’espace client." : "Annonce enregistrée comme brouillon.");
      await loadAnnouncements();
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setSaving(false);
    }
  }

  async function toggleAnnouncement(announcement) {
    setError("");
    try {
      await api(`/admin/announcements/${announcement.id}`, {
        method: "PATCH",
        body: {
          title: announcement.title,
          body: announcement.body,
          published: !announcement.published,
        },
      });
      await loadAnnouncements();
    } catch (cause) {
      setError(messageFrom(cause));
    }
  }

  async function deleteAnnouncement(announcement) {
    if (!window.confirm(`Supprimer l’annonce « ${announcement.title} » ?`)) return;
    setError("");
    try {
      await api(`/admin/announcements/${announcement.id}`, { method: "DELETE" });
      await loadAnnouncements();
    } catch (cause) {
      setError(messageFrom(cause));
    }
  }

  async function deleteCustomer(customer) {
    if (!window.confirm(`Supprimer définitivement le compte de ${customer.name}, ses commandes, paiements et justificatifs ? Cette action est irréversible.`)) return;
    setError("");
    setNotice("");
    try {
      await api(`/admin/customers/${customer.id}`, { method: "DELETE" });
      setNotice(`Le compte de ${customer.name} et ses données liées ont été supprimés.`);
      const currentPage = customersPage?.current_page || 1;
      await Promise.all([
        loadCustomers(currentPage > 1 && customersPage.data.length === 1 ? currentPage - 1 : currentPage),
        onCustomersChanged(),
      ]);
    } catch (cause) {
      setError(messageFrom(cause));
    }
  }

  function whatsappHref(customer) {
    const digits = String(customer.phone || "").replace(/\D/g, "");
    const phone = digits.startsWith("221") ? digits : `221${digits}`;
    const message = announcementTitle.trim() || announcementBody.trim()
      ? `${announcementTitle.trim()}${announcementTitle.trim() && announcementBody.trim() ? "\n\n" : ""}${announcementBody.trim()}`
      : `Bonjour ${customer.name}, nous avons une nouvelle pour vous chez Fatou Shop.`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  return (
    <div className="admin-customer-management">
      {error && <div className="admin-alert" role="alert">{error}</div>}
      {notice && <div className="admin-success" role="status"><Check size={15} /> {notice}</div>}
      <section className="admin-panel">
        <div className="admin-panel-head">
          <div><h2>Clients inscrits</h2><p>Nom réel, numéro, activité et accès WhatsApp individuel. La recherche couvre tous les clients.</p></div>
          <Users size={19} />
        </div>
        <form className="admin-customer-search" onSubmit={(event) => { event.preventDefault(); void loadCustomers(1, search); }}>
          <label className="admin-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un nom ou un numéro" /></label>
          <button type="submit" className="admin-primary-button"><Search size={14} /> Rechercher</button>
        </form>
        {!customersPage ? <SectionLoading /> : customersPage.data.length ? (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table admin-customer-table">
                <thead><tr><th>Client</th><th>Téléphone</th><th>Commandes</th><th>Invitations</th><th>Dépenses validées</th><th>Contacter</th><th>Compte</th></tr></thead>
                <tbody>{customersPage.data.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <div className="admin-customer-ident">
                        <span className="admin-customer-avatar">{customer.photo_url ? <img src={customer.photo_url} alt="" /> : customer.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
                        <span><strong>{customer.name}</strong><small>Inscrit le {dateTime(customer.created_at)}</small></span>
                      </div>
                    </td>
                    <td>{customer.phone}</td>
                    <td>{customer.orders_count}</td>
                    <td>{customer.referrals_count}</td>
                    <td className="table-price">{money(customer.amount_paid)}</td>
                    <td><a className="admin-whatsapp-link" href={whatsappHref(customer)} target="_blank" rel="noreferrer"><MessageCircle size={14} /> WhatsApp</a></td>
                    <td><button type="button" className="admin-customer-delete" onClick={() => void deleteCustomer(customer)} aria-label={`Supprimer le compte de ${customer.name}`}><Trash2 size={15} /></button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className="admin-customer-pagination">
              <span>{customersPage.total} client(s) · Page {customersPage.current_page} / {customersPage.last_page || 1}</span>
              <div>
                <button type="button" disabled={!customersPage.prev_page_url} onClick={() => void loadCustomers(customersPage.current_page - 1)}>Précédent</button>
                <button type="button" disabled={!customersPage.next_page_url} onClick={() => void loadCustomers(customersPage.current_page + 1)}>Suivant</button>
              </div>
            </div>
          </>
        ) : <EmptyState text="Aucun client inscrit ne correspond à cette recherche." />}
      </section>

      <section className="admin-panel">
        <div className="admin-panel-head">
          <div><h2><Megaphone size={18} /> Annonces clients</h2><p>Une annonce publiée s’affiche dans l’espace de tous les clients connectés.</p></div>
        </div>
        <form className="admin-announcement-form" onSubmit={createAnnouncement}>
          <label className="admin-field">Titre<input value={announcementTitle} onChange={(event) => setAnnouncementTitle(event.target.value)} maxLength={160} required /></label>
          <label className="admin-field">Message<textarea value={announcementBody} onChange={(event) => setAnnouncementBody(event.target.value)} rows={4} maxLength={5000} required /></label>
          <label className="admin-field">Produit à présenter (facultatif)
            <select name="product_id" defaultValue="">
              <option value="">Aucun produit associé</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name} · {money(product.price)} · {product.stock} en stock</option>)}
            </select>
          </label>
          <label className="admin-field">Photo de l’annonce (JPG, PNG ou WebP, 5 Mo max.)<input type="file" name="image" accept="image/jpeg,image/png,image/webp" /></label>
          <label className="admin-check"><input type="checkbox" checked={publishAnnouncement} onChange={(event) => setPublishAnnouncement(event.target.checked)} /> Publier immédiatement dans les espaces clients</label>
          <button type="submit" className="admin-primary-button" disabled={saving}>{saving ? "Enregistrement…" : publishAnnouncement ? "Publier l’annonce" : "Enregistrer le brouillon"} <Check size={15} /></button>
        </form>
        {announcementTitle || announcementBody
          ? <p className="admin-announcement-note">Les liens WhatsApp des clients utiliseront ce message prérempli. Chaque message doit être envoyé manuellement dans WhatsApp.</p>
          : null}
        <div className="admin-announcement-list">
          {announcements.map((announcement) => (
            <article key={announcement.id}>
              <div>
                {announcement.image_url && <img className="admin-announcement-image" src={announcement.image_url} alt="" />}
                <strong>{announcement.title}</strong><p>{announcement.body}</p>
                {announcement.product && <>
                  <small>Produit : {announcement.product.name} · {money(announcement.product.price)} · {announcement.product.stock} en stock</small>
                  <button type="button" className="admin-announcement-share" onClick={() => void copyProductLink(announcement.product)}><Share2 size={12} /> Copier le lien du produit</button>
                </>}
                <small>{announcement.published ? "Publiée" : "Brouillon"}{announcement.published_at ? ` · ${dateTime(announcement.published_at)}` : ""}</small>
              </div>
              <button type="button" onClick={() => void toggleAnnouncement(announcement)}>{announcement.published ? "Dépublier" : "Publier"}</button>
              <button type="button" className="admin-customer-delete" onClick={() => void deleteAnnouncement(announcement)} aria-label={`Supprimer l’annonce ${announcement.title}`}><Trash2 size={14} /></button>
            </article>
          ))}
          {!announcements.length && <EmptyState text="Aucune annonce enregistrée pour le moment." />}
        </div>
      </section>
    </div>
  );
}

function ReferralMetric({ label, value, note, icon: Icon, tone }) {
  return (
    <article className="admin-metric-card">
      <span className={`metric-icon ${tone}`}><Icon size={17} /></span>
      <span className="metric-label">{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function RankingTable({ title, rows, value, empty }) {
  return (
    <section className="admin-panel">
      <div className="admin-panel-head"><div><h2>{title}</h2></div><Users size={18} /></div>
      {rows.length ? <div className="admin-ranking-list">{rows.slice(0, 10).map((customer, index) => (
        <div className="admin-ranking-customer" key={customer.id}>
          <span className="ranking-number">{String(index + 1).padStart(2, "0")}</span>
          <div><strong>{customer.name}</strong><small>{customer.phone} · Code {customer.referral_code}</small></div>
          <b>{value(customer)}</b>
        </div>
      ))}</div> : <EmptyState text={empty} />}
    </section>
  );
}

function StatusPill({ value, kind }) {
  const labels = {
    pending: "À traiter", confirmed: "Confirmée", preparing: "Préparation", in_delivery: "En livraison", delivered: "Livrée", cancelled: "Annulée",
    unpaid: "Non payé", submitted: "À vérifier", verified: "Validé", rejected: "Refusé",
    Actif: "En vitrine", Masqué: "Masqué",
  };
  return <span className={`status-pill ${kind || ""} ${value}`}>{labels[value] || value}</span>;
}

function EmptyState({ text }) {
  return <div className="admin-empty"><span><Package size={20} /></span><p>{text}</p></div>;
}

function SectionLoading() {
  return <div className="admin-section-loading"><span className="admin-spinner" /> Chargement des données…</div>;
}

function SectionError({ error }) {
  return <div className="admin-alert" role="alert">{error}</div>;
}

export default AdminPortal;
