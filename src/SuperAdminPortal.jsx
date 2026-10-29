import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ArrowLeft,
  BadgeCheck,
  Boxes,
  ClipboardList,
  Clock3,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Plus,
  RefreshCw,
  Shield,
  ShieldAlert,
  Users,
} from "lucide-react";
import { api } from "./adminApi.js";
import "./superadmin.css";

const money = (value) => `${new Intl.NumberFormat("fr-FR").format(value || 0)} F CFA`;
const dateTime = (value) => value
  ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "—";

const navigation = [
  { id: "overview", label: "Vue générale", icon: LayoutDashboard },
  { id: "admins", label: "Administrateurs", icon: Users },
  { id: "orders", label: "Toutes les commandes", icon: ClipboardList },
  { id: "activity", label: "Journal d’activité", icon: Activity },
];

function errorText(error) {
  return error instanceof Error ? error.message : "Une erreur inattendue s’est produite.";
}

export default function SuperAdminPortal() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [section, setSection] = useState("overview");
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api("/superadmin/me")
      .then(({ user: current }) => { if (active) setUser(current); })
      .catch((cause) => {
        if (active && !String(cause.message).includes("Unauthenticated")) setError(errorText(cause));
      })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    document.title = "Superadministration — Fatou Shop";
  }, []);

  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  async function logout() {
    try {
      await api("/superadmin/logout", { method: "POST" });
      setUser(null);
      setSection("overview");
    } catch (cause) {
      setError(errorText(cause));
    }
  }

  if (checking) {
    return <main className="superadmin-loading"><LoaderCircle className="superadmin-spin" size={23} /> Vérification de l’accès sécurisé…</main>;
  }

  if (!user) {
    return <SuperAdminLogin onLogin={setUser} initialError={error} />;
  }

  const current = navigation.find((item) => item.id === section) || navigation[0];
  const Icon = current.icon;

  return (
    <div className="superadmin-shell">
      <aside className="superadmin-sidebar">
        <a className="superadmin-brand" href="/">FATOU SHOP<span>CONTRÔLE SUPERADMIN</span></a>
        <div className="superadmin-safety"><Shield size={15} /> Accès propriétaire</div>
        <nav className="superadmin-navigation" aria-label="Navigation superadmin">
          {navigation.map(({ id, label, icon: NavIcon }) => (
            <button key={id} type="button" className={section === id ? "active" : ""} onClick={() => { setSection(id); setError(""); }}>
              <NavIcon size={18} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <a className="superadmin-store-admin" href="/admin"><Shield size={16} /> Gestion complète de la boutique</a>
        <div className="superadmin-account">
          <div className="superadmin-account-avatar">{user.name?.slice(0, 1).toUpperCase() || "S"}</div>
          <div className="superadmin-account-name"><strong>{user.name}</strong><span>Superadministrateur</span></div>
          <button type="button" onClick={logout} aria-label="Déconnexion" title="Déconnexion"><LogOut size={17} /></button>
        </div>
      </aside>

      <main className="superadmin-main">
        <header className="superadmin-topbar">
          <div>
            <span className="superadmin-kicker"><Icon size={14} /> FATOU SHOP · CONTRÔLE GLOBAL</span>
            <h1>{current.label}</h1>
            <p>Administration des accès, activité et commandes de la boutique.</p>
          </div>
          <div className="superadmin-top-actions">
            <button type="button" className="superadmin-refresh" onClick={refresh}><RefreshCw size={15} /> Actualiser</button>
            <a href="/" className="superadmin-store-link"><ArrowLeft size={15} /> Vitrine</a>
          </div>
        </header>
        {error && <div className="superadmin-alert" role="alert">{error}</div>}
        <section className="superadmin-content" key={`${section}-${revision}`}>
          {section === "overview" && <OverviewSection revision={revision} onNavigate={setSection} />}
          {section === "admins" && <AdminsSection revision={revision} onChanged={refresh} />}
          {section === "orders" && <OrdersSection revision={revision} />}
          {section === "activity" && <ActivitySection revision={revision} />}
        </section>
      </main>
    </div>
  );
}

function SuperAdminLogin({ onLogin, initialError }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const { user } = await api("/superadmin/login", { method: "POST", body: { email, password } });
      onLogin(user);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="superadmin-login-page">
      <a className="superadmin-login-back" href="/"><ArrowLeft size={15} /> Retour à Fatou Shop</a>
      <form className="superadmin-login-card" onSubmit={submit}>
        <div className="superadmin-login-mark"><ShieldAlert size={25} /></div>
        <span className="superadmin-login-kicker">ACCÈS PROPRIÉTAIRE · SESSION SÉCURISÉE</span>
        <h1>Super<br /><em>administration.</em></h1>
        <p>Connectez-vous avec les identifiants superadmin configurés pour cette boutique.</p>
        <label>E-mail<input autoComplete="username" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label>Mot de passe<input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        {error && <div className="superadmin-alert" role="alert">{error}</div>}
        <button className="superadmin-primary" disabled={submitting}>
          <Shield size={16} /> {submitting ? "Connexion…" : "Ouvrir le contrôle global"}
        </button>
        <span className="superadmin-login-note">Les tentatives de connexion sont enregistrées dans le journal d’activité.</span>
      </form>
    </main>
  );
}

function useSuperAdminData(path, revision) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api(path)
      .then((response) => { if (active) { setData(response); setError(""); } })
      .catch((cause) => { if (active) setError(errorText(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [path, revision]);

  return { data, error, loading };
}

function OverviewSection({ revision, onNavigate }) {
  const { data, error, loading } = useSuperAdminData("/superadmin/dashboard", revision);
  const metrics = data?.metrics;

  if (loading) return <SectionLoading />;
  if (error) return <SectionError message={error} />;

  const cards = [
    { label: "Commandes au total", value: metrics.orders, icon: ClipboardList },
    { label: "Commandes aujourd’hui", value: metrics.orders_today, icon: Clock3 },
    { label: "Commandes en attente", value: metrics.orders_pending, icon: ClipboardList },
    { label: "Paiements à contrôler", value: metrics.payments_to_review, icon: BadgeCheck },
    { label: "Paiements validés", value: metrics.payments_verified, icon: DollarSign },
    { label: "Chiffre encaissé", value: money(metrics.revenue_verified), icon: DollarSign },
    { label: "Articles au catalogue", value: metrics.products, icon: Boxes },
    { label: "Clients inscrits", value: metrics.clients, icon: Users },
    { label: "Admins actifs / total", value: `${metrics.admins} / ${metrics.admins_total}`, icon: Shield },
  ];

  return (
    <>
      <div className="superadmin-metrics">
        {cards.map(({ label, value, icon: CardIcon }) => (
          <article className="superadmin-metric" key={label}>
            <span className="superadmin-metric-icon"><CardIcon size={17} /></span>
            <span className="superadmin-metric-label">{label}</span>
            <strong>{value ?? 0}</strong>
          </article>
        ))}
      </div>
      <div className="superadmin-columns">
        <section className="superadmin-panel">
          <PanelHeading title="Commandes récentes" action="Voir toutes" onClick={() => onNavigate("orders")} />
          <OrderTable orders={data.latest_orders || []} compact />
        </section>
        <section className="superadmin-panel">
          <PanelHeading title="Activité récente" action="Voir le journal" onClick={() => onNavigate("activity")} />
          <ActivityTable events={data.latest_activity || []} />
        </section>
      </div>
      <p className="superadmin-privacy-note">Le journal conserve les accès et requêtes d’administration, sans enregistrer les mots de passe ni le contenu des justificatifs.</p>
    </>
  );
}

function AdminsSection({ revision, onChanged }) {
  const [page, setPage] = useState(1);
  const { data, error, loading } = useSuperAdminData(`/superadmin/admins?page=${page}`, revision);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", password_confirmation: "" });
  const [passwordTarget, setPasswordTarget] = useState(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const admins = data?.data || [];

  async function createAdmin(event) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      await api("/superadmin/admins", { method: "POST", body: form });
      setForm({ name: "", email: "", password: "", password_confirmation: "" });
      onChanged();
    } catch (cause) {
      setFormError(errorText(cause));
    } finally {
      setSaving(false);
    }
  }

  async function toggleAdmin(admin) {
    setFormError("");
    try {
      await api(`/superadmin/admins/${admin.id}`, {
        method: "PATCH",
        body: { admin_active: !admin.admin_active },
      });
      onChanged();
    } catch (cause) {
      setFormError(errorText(cause));
    }
  }

  async function resetAdminPassword(event) {
    event.preventDefault();
    if (!passwordTarget) return;
    setPasswordSaving(true);
    setFormError("");
    try {
      await api(`/superadmin/admins/${passwordTarget.id}`, {
        method: "PATCH",
        body: { password: adminPassword, password_confirmation: passwordConfirmation },
      });
      setPasswordTarget(null);
      setAdminPassword("");
      setPasswordConfirmation("");
      onChanged();
    } catch (cause) {
      setFormError(errorText(cause));
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="superadmin-admin-layout">
      <section className="superadmin-panel">
        <PanelHeading title="Comptes administrateurs" subtitle="Créer, consulter ou suspendre un accès à la boutique." />
        {(formError || error) && <SectionError message={formError || error} />}
        {loading ? <SectionLoading /> : (
          <div className="superadmin-table-wrap">
            <table className="superadmin-table">
              <thead><tr><th>Administrateur</th><th>Créé le</th><th>Accès</th><th></th></tr></thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id}>
                    <td><strong>{admin.name}</strong><small>{admin.email}</small></td>
                    <td>{dateTime(admin.created_at)}</td>
                    <td><span className={`superadmin-status ${admin.admin_active ? "is-active" : "is-disabled"}`}>{admin.admin_active ? "Actif" : "Suspendu"}</span></td>
                    <td><div className="superadmin-admin-actions">
                      <button className="superadmin-text-button" type="button" onClick={() => toggleAdmin(admin)}>{admin.admin_active ? "Suspendre" : "Réactiver"}</button>
                      <button className="superadmin-text-button" type="button" onClick={() => { setPasswordTarget(admin); setFormError(""); }}>Réinitialiser le mot de passe</button>
                    </div></td>
                  </tr>
                ))}
                {!admins.length && <tr><td colSpan="4">Aucun administrateur.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        {passwordTarget && (
          <form className="superadmin-password-reset" onSubmit={resetAdminPassword}>
            <strong>Nouveau mot de passe · {passwordTarget.email}</strong>
            <input aria-label="Nouveau mot de passe admin" type="password" autoComplete="new-password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} minLength="14" placeholder="14 caractères minimum" required />
            <input aria-label="Confirmer le nouveau mot de passe" type="password" autoComplete="new-password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} minLength="14" placeholder="Confirmer le nouveau mot de passe" required />
            <button className="superadmin-primary" disabled={passwordSaving}>{passwordSaving ? "Mise à jour…" : "Enregistrer le mot de passe"}</button>
            <button className="superadmin-text-button" type="button" onClick={() => setPasswordTarget(null)}>Annuler</button>
          </form>
        )}
        {data && <Paginator data={data} onPage={setPage} />}
      </section>
      <form className="superadmin-panel superadmin-create-form" onSubmit={createAdmin}>
        <PanelHeading title="Créer un accès" subtitle="Mot de passe de 14 caractères minimum." />
        <label>Nom complet<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength="120" required /></label>
        <label>E-mail professionnel<input type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
        <label>Mot de passe temporaire<input type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} minLength="14" required /></label>
        <label>Confirmer le mot de passe<input type="password" autoComplete="new-password" value={form.password_confirmation} onChange={(event) => setForm({ ...form, password_confirmation: event.target.value })} minLength="14" required /></label>
        <button className="superadmin-primary" disabled={saving}><Plus size={16} /> {saving ? "Création…" : "Créer l’administrateur"}</button>
      </form>
    </div>
  );
}

function OrdersSection({ revision }) {
  const [page, setPage] = useState(1);
  const { data, error, loading } = useSuperAdminData(`/superadmin/orders?page=${page}`, revision);
  if (loading) return <SectionLoading />;
  if (error) return <SectionError message={error} />;
  return (
    <section className="superadmin-panel">
      <PanelHeading title="Historique complet des commandes" subtitle={`${data.total || 0} commande(s) enregistrée(s)`} />
      <OrderTable orders={data.data || []} />
      <Paginator data={data} onPage={setPage} />
    </section>
  );
}

function ActivitySection({ revision }) {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState({ action: "", email: "" });
  const [appliedFilter, setAppliedFilter] = useState(filter);
  const params = new URLSearchParams({ page: String(page) });
  if (appliedFilter.action) params.set("action", appliedFilter.action);
  if (appliedFilter.email) params.set("account", appliedFilter.email);
  const { data, error, loading } = useSuperAdminData(`/superadmin/activity?${params}`, revision);
  if (loading) return <SectionLoading />;
  if (error) return <SectionError message={error} />;
  return (
    <section className="superadmin-panel">
      <PanelHeading title="Journal d’activité" subtitle={`${data.total || 0} événement(s) · derniers accès et opérations administratives`} />
      <form className="superadmin-activity-filter" onSubmit={(event) => { event.preventDefault(); setPage(1); setAppliedFilter(filter); }}>
        <input aria-label="Filtrer par événement" placeholder="Événement (ex. login, orders)" value={filter.action} onChange={(event) => setFilter({ ...filter, action: event.target.value })} />
        <input aria-label="Filtrer par e-mail ou téléphone" placeholder="E-mail ou téléphone" value={filter.email} onChange={(event) => setFilter({ ...filter, email: event.target.value })} />
        <button type="submit">Filtrer</button>
      </form>
      <ActivityTable events={data.data || []} detailed />
      <Paginator data={data} onPage={setPage} />
    </section>
  );
}

function PanelHeading({ title, subtitle, action, onClick }) {
  return (
    <div className="superadmin-panel-heading">
      <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
      {action && <button className="superadmin-text-button" type="button" onClick={onClick}>{action}</button>}
    </div>
  );
}

function OrderTable({ orders, compact = false }) {
  return (
    <div className="superadmin-table-wrap">
      <table className="superadmin-table">
        <thead><tr><th>Référence / client</th><th>Montant</th><th>Commande</th><th>Paiement</th>{!compact && <th>Livraison</th>}</tr></thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td><strong>{order.reference || `#${order.id}`}</strong><small>{order.customer_name} · {order.customer_phone}</small></td>
              <td>{money(order.total)}</td>
              <td><span className="superadmin-status">{order.status}</span></td>
              <td><span className={`superadmin-status ${order.payment_status === "verified" ? "is-active" : "is-pending"}`}>{order.payment_status}</span></td>
              {!compact && <td>{order.driver?.name || "Non attribuée"}<small>{order.delivery_zone_name || order.delivery_address}</small></td>}
            </tr>
          ))}
          {!orders.length && <tr><td colSpan={compact ? 4 : 5}>Aucune commande enregistrée.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function ActivityTable({ events, detailed = false }) {
  return (
    <div className="superadmin-table-wrap">
      <table className="superadmin-table">
        <thead><tr><th>Événement</th><th>Compte</th><th>Date</th>{detailed && <><th>Requête / résultat</th><th>Adresse IP</th></>}</tr></thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td><strong>{event.action}</strong></td>
              <td>{event.actor_label || "Connexion refusée"}</td>
              <td>{dateTime(event.created_at)}</td>
              {detailed && <><td>{event.method || "—"} {event.path || "—"}<small>{event.status ? `HTTP ${event.status}` : ""}</small></td><td>{event.ip_address || "—"}</td></>}
            </tr>
          ))}
          {!events.length && <tr><td colSpan={detailed ? 5 : 3}>Aucun événement pour le moment.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function SectionLoading() {
  return <div className="superadmin-section-loading"><LoaderCircle className="superadmin-spin" size={20} /> Chargement des données…</div>;
}

function SectionError({ message }) {
  return <div className="superadmin-alert" role="alert">{message}</div>;
}

function Paginator({ data, onPage }) {
  if (!data || data.last_page < 2) return null;

  return (
    <div className="superadmin-pagination">
      <span>Page {data.current_page} sur {data.last_page} · {data.total} résultat(s)</span>
      <div>
        <button type="button" aria-label="Page précédente" disabled={data.current_page <= 1} onClick={() => onPage(data.current_page - 1)}><ChevronLeft size={16} /></button>
        <button type="button" aria-label="Page suivante" disabled={data.current_page >= data.last_page} onClick={() => onPage(data.current_page + 1)}><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}
