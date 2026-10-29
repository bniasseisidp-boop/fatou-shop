import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock3,
  Camera,
  Mail,
  MapPin,
  Mic,
  Menu,
  MessageCircle,
  PackageCheck,
  Plane,
  Phone,
  Plus,
  Send,
  ShoppingBag,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { api } from "./adminApi.js";
import DeliveryMap from "./DeliveryMap.jsx";
import "./map.css";

const CONTACT_PHONE = "221777364427";
const CONTACT_EMAIL = "fatoudiagnendoye75@gmail.com";

const products = [
  {
    id: 1,
    name: "Le sac Brooklyn",
    category: "Sacs",
    price: 42500,
    oldPrice: 52000,
    label: "Coup de cœur",
    image:
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1000&q=85",
    alt: "Sac à main brun en cuir, silhouette structurée",
    tone: "sand",
    description: "Une silhouette intemporelle et une belle capacité, choisies pour accompagner vos journées comme vos sorties.",
  },
  {
    id: 2,
    name: "L’essentiel doré",
    category: "Bijoux",
    price: 18500,
    oldPrice: null,
    label: "Édition limitée",
    image:
      "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=1000&q=85",
    alt: "Bijoux dorés délicats présentés sur une surface claire",
    tone: "rose",
    description: "Une touche lumineuse et délicate, facile à porter seule ou à associer à vos bijoux préférés.",
  },
  {
    id: 3,
    name: "Veste Downtown",
    category: "Mode",
    price: 39000,
    oldPrice: null,
    label: "Nouveau",
    image:
      "https://images.unsplash.com/photo-1548126032-079a0fb0099d?auto=format&fit=crop&w=1000&q=85",
    alt: "Veste de mode américaine aux lignes contemporaines",
    tone: "olive",
    description: "Une pièce de caractère aux lignes urbaines, parfaite pour composer une tenue qui vous ressemble.",
  },
  {
    id: 4,
    name: "Lunettes Westside",
    category: "Accessoires",
    price: 16500,
    oldPrice: 20000,
    label: "En vogue",
    image:
      "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1000&q=85",
    alt: "Lunettes de soleil noires sur fond chaud",
    tone: "clay",
    description: "Une monture affirmée et facile à porter pour compléter votre allure au quotidien.",
  },
  {
    id: 5,
    name: "Le cabas SoHo",
    category: "Sacs",
    price: 35000,
    oldPrice: null,
    label: "Belle trouvaille",
    image: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1000&q=85",
    alt: "Sac cabas élégant pour tous les jours",
    tone: "sand",
    description: "Le compagnon spacieux et chic pour vos journées bien remplies.",
  },
  {
    id: 6,
    name: "La veste Central Park",
    category: "Mode",
    price: 45000,
    oldPrice: null,
    label: "Style urbain",
    image: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1000&q=85",
    alt: "Tenue de mode féminine élégante",
    tone: "rose",
    description: "Une silhouette soignée inspirée du style citadin américain.",
  },
  {
    id: 7,
    name: "Les créoles Madison",
    category: "Bijoux",
    price: 14000,
    oldPrice: null,
    label: "À porter partout",
    image: "https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=1000&q=85",
    alt: "Créoles dorées élégantes",
    tone: "clay",
    description: "Des créoles lumineuses pour une élégance simple du matin au soir.",
  },
  {
    id: 8,
    name: "Lunettes Manhattan",
    category: "Accessoires",
    price: 19500,
    oldPrice: null,
    label: "Nouveau",
    image: "https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=1000&q=85",
    alt: "Lunettes de soleil de forme moderne",
    tone: "olive",
    description: "Une paire de lunettes de soleil pour apporter la touche finale à votre look.",
  },
];

const deliveryFees = {
  "Dieuppeul-Derklé": 1500,
  "Mermoz": 2000,
  "Sacré-Cœur": 2000,
  "Ouakam": 2500,
  "Fann-Résidence": 2500,
  "Point E": 2500,
  "HLM": 2000,
  "Liberté 6": 2000,
  "Parcelles Assainies": 3000,
  "Pikine": 3500,
  "Guédiawaye": 3500,
  "Autre quartier de Dakar": 3000,
};

const formatPrice = (price) =>
  `${new Intl.NumberFormat("fr-FR").format(price)} F CFA`;

function formatPhoneNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  const national = digits.startsWith("221") ? digits.slice(3) : digits;
  return national.length === 9
    ? `+221 ${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5, 7)} ${national.slice(7)}`
    : String(value || "");
}

function BrandWordmark({ name }) {
  const words = String(name || "Fatou Shop").trim().split(/\s+/);
  return <>{words.slice(0, -1).join(" ")}<span>{words.at(-1)}</span><i>.</i></>;
}

function App() {
  const [activeCategory, setActiveCategory] = useState("Tout voir");
  const [cart, setCart] = useState([]);
  const [storefront, setStorefront] = useState(null);
  const [storefrontError, setStorefrontError] = useState("");
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [isArticlesPage, setIsArticlesPage] = useState(
    () => window.location.hash === "#articles",
  );

  useEffect(() => {
    api("/storefront")
      .then((data) => {
        setStorefront(data);
        setStorefrontError("");
      })
      .catch(() => {
        setStorefrontError("La connexion à la boutique est indisponible. Les données affichées sont des exemples.");
      });
  }, []);

  const brand = storefront?.settings?.brand || {
    name: "Fatou Shop",
    email: CONTACT_EMAIL,
    phone: CONTACT_PHONE,
    origin: "Dieuppeul-Derklé, Dakar",
    tagline: "L’Amérique, tout près de vous",
  };
  const story = storefront?.settings?.story || {
    headline: "Bonjour, moi c’est Fatou.",
    short: "J’ai toujours aimé les pièces qui racontent quelque chose : un sac qui donne confiance, un bijou qui finit une tenue, un vêtement qu’on garde longtemps.",
    description: "De Dieuppeul-Derklé aux trouvailles américaines, Fatou Shop partage une sélection choisie avec attention.",
  };
  const contactPhone = String(brand.phone || CONTACT_PHONE).replace(/\D/g, "");
  const contactDisplay = formatPhoneNumber(contactPhone);
  const shopProducts = storefront ? storefront.products : products;
  const deliveryZones = storefront
    ? storefront.delivery_zones
    : Object.entries(deliveryFees).map(([name, fee]) => ({ id: name, name, fee }));
  const shopCategories = ["Tout voir", ...new Set(shopProducts.map((product) => product.category))];

  useEffect(() => {
    if (brand.name) {
      document.title = `${brand.name} — ${brand.tagline || "L’Amérique, tout près de vous"}`;
    }
  }, [brand.name, brand.tagline]);
  const visibleProducts =
    activeCategory === "Tout voir"
      ? shopProducts.slice(0, 4)
      : shopProducts.slice(0, 4).filter((product) => product.category === activeCategory);
  const catalogProducts =
    activeCategory === "Tout voir"
      ? shopProducts
      : shopProducts.filter((product) => product.category === activeCategory);

  useEffect(() => {
    function handleHashChange() {
      const nextIsArticlesPage = window.location.hash === "#articles";
      setIsArticlesPage(nextIsArticlesPage);
      setMobileMenuOpen(false);

      if (!nextIsArticlesPage && window.location.hash.length > 1) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            document
              .getElementById(window.location.hash.slice(1))
              ?.scrollIntoView({ behavior: "smooth" });
          });
        });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  function addToCart(product) {
    if (typeof product.stock === "number" && product.stock <= 0) {
      setNotice(`${product.name} est actuellement en rupture de stock`);
      window.setTimeout(() => setNotice(""), 2800);
      return;
    }
    const match = cart.find((item) => item.id === product.id);
    if (match && typeof product.stock === "number" && match.quantity >= product.stock) {
      setNotice(`Stock disponible : ${product.stock} unité(s) de ${product.name}`);
      window.setTimeout(() => setNotice(""), 2800);
      return;
    }
    setNotice("");
    setCart((current) => {
      if (match) {
        return current.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...current, { ...product, quantity: 1 }];
    });
    setNotice(`${product.name} ajouté à votre sélection`);
    window.setTimeout(() => setNotice(""), 2800);
  }

  const openOrder = () => {
    setIsOrderOpen(true);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <div className="announcement">
        <Sparkles size={13} strokeWidth={1.7} />
        <span>Des trouvailles des États-Unis, livrées à Dakar</span>
        <span className="announcement-divider">•</span>
        <span>Livraison depuis {brand.origin}</span>
      </div>

      <header className="site-header">
        <a className="wordmark" href={isArticlesPage ? "/#accueil" : "#accueil"} aria-label={`${brand.name}, accueil`}>
          <BrandWordmark name={brand.name.toUpperCase()} />
        </a>
        <nav className={`main-nav ${mobileMenuOpen ? "is-open" : ""}`}>
          <a href="#articles" onClick={() => setMobileMenuOpen(false)}>
            Nos trouvailles
          </a>
          <a href={isArticlesPage ? "/#histoire" : "#histoire"} onClick={() => setMobileMenuOpen(false)}>
            Notre histoire
          </a>
          <a href={isArticlesPage ? "/#livraison" : "#livraison"} onClick={() => setMobileMenuOpen(false)}>
            Livraison
          </a>
          <a href={isArticlesPage ? "/#contact" : "#contact"} onClick={() => setMobileMenuOpen(false)}>
            Contact
          </a>
          <a className="client-account-link" href="/client">Mon espace client</a>
          <button className="mobile-order-link" onClick={openOrder}>
            Commander <ArrowUpRight size={16} />
          </button>
        </nav>
        <div className="header-actions">
          <button className="cart-button" onClick={openOrder} aria-label={`Ouvrir le panier, ${cartCount} article(s)`}>
            <ShoppingBag size={18} strokeWidth={1.6} />
            <span>Ma sélection</span>
            <b>{cartCount}</b>
          </button>
          <button className="header-order" onClick={openOrder}>
            Commander <ArrowUpRight size={15} />
          </button>
          <button
            className="menu-toggle"
            aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </header>

      <main>
        {storefrontError && <p className="storefront-sync-warning" role="status">{storefrontError}</p>}
        {isArticlesPage ? (
          <ArticlesPage
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            products={catalogProducts}
            addToCart={addToCart}
            brand={brand}
            contactPhone={contactPhone}
            contactDisplay={contactDisplay}
            categoryOptions={shopCategories}
          />
        ) : (
          <>
        <section className="hero" id="accueil">
          <div className="hero-3d-scene" aria-hidden="true">
            <span className="scene-atmosphere" />
            <span className="scene-orbit scene-orbit-one" />
            <span className="scene-orbit scene-orbit-two" />
          </div>
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> Dakar, Sénégal · Sélection USA</div>
            <h1>
              Le style
              <br />
              <em>sans</em> frontières<span className="red-period">.</span>
            </h1>
            <p className="hero-description">
              {brand.tagline}. Les pièces qu’on aime, dénichées aux États-Unis et choisies
              spécialement pour vous. Un peu de New York, tout près de chez vous.
            </p>
            <div className="hero-actions">
              <a className="button button-dark" href="#articles">
                Explorer les trouvailles <ArrowDownRight size={16} />
              </a>
              <span className="hero-stock-note">
                <span className="stock-dot" /> Petite série, belles trouvailles
              </span>
            </div>
            <div className="hero-signature">
              <span className="signature-line" />
              <span>Amoureusement choisi par Fatou</span>
            </div>
          </div>

          <div className="hero-art" aria-label={`Sélection mode ${brand.name}`}>
            <div className="hero-stage">
              <div className="stage-ring stage-ring-one" />
              <div className="stage-ring stage-ring-two" />
              <div className="stage-disc" />
              <div className="hero-img-main">
                <img
                  src={shopProducts[0]?.image || products[0].image}
                  alt="Sac à main élégant, pièce signature de la collection Fatou Shop"
                  fetchPriority="high"
                />
              </div>
              <div className="hero-img-detail">
                <img
                  src={shopProducts[1]?.image || shopProducts[0]?.image || products[1].image}
                  alt="Détail d’un bijou doré"
                />
              </div>
              <div className="hero-sticker">
                <span>LES BELLES</span>
                <strong>TROUVAILLES</strong>
                <i>depuis les USA</i>
              </div>
              <div className="hero-side-note">OBJETS À AIMER · 2026</div>
              <span className="hero-star hero-star-one">✳</span>
              <span className="hero-star hero-star-two">✳</span>
            </div>
            <div className="hero-image-caption">
              <span>01 / 04</span><span>LA SÉLECTION DU MOMENT</span>
              <span>NEW YORK → DAKAR</span>
            </div>
          </div>

          <div className="hero-bottom">
              <a href="#articles" className="scroll-cue">
              <span className="scroll-icon"><ArrowDown size={14} /></span>
              DÉFILER POUR DÉCOUVRIR
            </a>
            <span className="hero-bottom-note">L’ALLURE NEW-YORKAISE, L’ACCUEIL DAKAROIS.</span>
          </div>
        </section>

        <section className="ticker" aria-label="Nos engagements">
          <div className="ticker-track">
            {[0, 1].map((repeat) => (
              <div className="ticker-set" key={repeat} aria-hidden={repeat === 1}>
                <span>Pièces choisies avec soin</span><i>✳</i>
                <span>Venant des États-Unis</span><i>✳</i>
                <span>Livraison à Dakar</span><i>✳</i>
                <span>Du style, sans détour</span><i>✳</i>
              </div>
            ))}
          </div>
        </section>

        <section className="collection section-pad" id="collection">
          <div className="section-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-dot" /> Le vestiaire Fatou</div>
              <h2>De belles choses.<br /><em>Juste pour vous.</em></h2>
            </div>
            <p className="section-heading-note">
              Quatre univers, un même coup de cœur : les belles pièces qu’on
              n’a pas envie de laisser passer.
            </p>
          </div>

          <div className="category-row" aria-label="Filtrer les produits">
            <div className="category-tabs">
              {shopCategories.map((category) => (
                <button
                  key={category}
                  className={activeCategory === category ? "category-tab active" : "category-tab"}
                  onClick={() => setActiveCategory(category)}
                  aria-pressed={activeCategory === category}
                >
                  {category}
                </button>
              ))}
            </div>
            <span className="product-count">0{visibleProducts.length} PIÈCES</span>
          </div>

          <div className="product-grid">
            {visibleProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                addToCart={addToCart}
                compact
              />
            ))}
          </div>
          <div className="collection-foot">
            <p>Une question sur une pièce ? Fatou est là pour vous.</p>
            <a href="#articles">
              Voir toutes les trouvailles <ArrowUpRight size={15} />
            </a>
          </div>
        </section>

        <section className="story" id="histoire">
          <div className="story-image-wrap">
            <img
              src="/bfa.jpeg"
              alt={`Fatou, créatrice de la boutique ${brand.name}`}
              fetchPriority="high"
            />
            <div className="story-image-frame" />
            <span className="story-image-tag">LA PERSONNE DERRIÈRE LES TROUVAILLES</span>
          </div>
          <div className="story-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> Une histoire de goût</div>
            <h2>{story.headline}</h2>
            <p>{story.short}</p>
            <p>{story.description}</p>
            <div className="signature">Fatou<span>.</span></div>
            <a className="text-link" href={`https://wa.me/${contactPhone}`} target="_blank" rel="noreferrer">
              Faisons connaissance <ArrowUpRight size={15} />
            </a>
          </div>
          <span className="story-ornament" aria-hidden="true">F.</span>
        </section>

        <section className="delivery section-pad" id="livraison">
          <div className="delivery-intro">
            <div className="eyebrow"><span className="eyebrow-dot" /> Tout près de vous</div>
            <h2>{brand.origin.split(",")[0]}<br />à <em>votre porte.</em></h2>
            <p>
              Votre quartier, votre tarif. Choisissez simplement votre zone
              lors de la commande ; Fatou vous confirme le délai par WhatsApp.
            </p>
            <span className="delivery-origin"><MapPin size={15} /> Départ {brand.origin}</span>
          </div>
          <div className="delivery-card" id="tarifs">
            <div className="delivery-card-head">
              <span>QUELQUES QUARTIERS DE DAKAR</span>
              <span className="delivery-card-mark">01 — 06</span>
            </div>
            <div className="fee-list">
              {deliveryZones.slice(0, 6).map((zone, index) => (
                <div className="fee-row" key={zone.id}>
                  <span className="fee-number">0{index + 1}</span>
                  <span>{zone.name}</span>
                  <span className="fee-dots" />
                  <strong>{formatPrice(zone.fee)}</strong>
                </div>
              ))}
            </div>
            <p className="fee-disclaimer">
              {storefront ? "Tarifs configurés par la boutique. Les frais sont recalculés à la commande." : "Tarifs indicatifs de démonstration — à confirmer avec Fatou. Les frais pour les autres zones sont affichés au formulaire."}
            </p>
          </div>
        </section>

        <section className="store-map-section section-pad" aria-labelledby="store-map-title">
          <div className="store-map-heading">
            <div><div className="eyebrow"><span className="eyebrow-dot" /> Nous trouver à Dakar</div><h2 id="store-map-title">Fatou Shop à <em>Dieuppeul-Derklé.</em></h2></div>
            <p>Le repère affiché est une position approximative du quartier. Fatou peut ajuster l’emplacement précis depuis l’administration.</p>
          </div>
          <DeliveryMap storeLocation={storefront?.settings?.store_location || { latitude: 14.712, longitude: -17.454 }} />
        </section>

        <section className="promise-row" aria-label="Les petits plus Fatou Shop">
          <article><span className="promise-icon"><Sparkles size={18} /></span><div><h3>Choisi avec amour</h3><p>Chaque pièce est sélectionnée par Fatou.</p></div></article>
          <article><span className="promise-icon"><PackageCheck size={18} /></span><div><h3>Une commande facile</h3><p>On confirme chaque détail ensemble.</p></div></article>
          <article><span className="promise-icon"><Clock3 size={18} /></span><div><h3>Un vrai suivi</h3><p>Fatou reste disponible sur WhatsApp.</p></div></article>
        </section>

        <section className="contact-banner" id="contact">
          <div className="contact-copy">
            <div className="eyebrow eyebrow-light"><span className="eyebrow-dot" /> On vous répond avec plaisir</div>
            <h2>Un coup de cœur ?<br /><em>Parlons-en.</em></h2>
            <p>Une taille, un prix ou une livraison à vérifier ? Un petit message et Fatou vous répond.</p>
          </div>
          <div className="contact-methods">
            <article className="contact-method">
              <span className="contact-method-icon"><Mail size={19} /></span>
              <div className="contact-method-copy">
                <small>NOUS ÉCRIRE · E-MAIL</small>
                <a className="contact-email-link" href={`mailto:${brand.email}`}>{brand.email}</a>
                <p>La réception des messages dans l’espace admin sera disponible bientôt. En attendant, votre messagerie s’ouvrira.</p>
              </div>
              <ArrowUpRight className="contact-method-arrow" size={18} />
            </article>
            <article className="contact-method">
              <span className="contact-method-icon contact-phone-icon"><Phone size={19} /></span>
              <div className="contact-method-copy">
                <small>APPEL DIRECT OU WHATSAPP</small>
                <strong>{contactDisplay}</strong>
                <div className="contact-actions">
                  <a href={`tel:+${contactPhone}`}>Appeler</a>
                  <a href={`https://wa.me/${contactPhone}`} target="_blank" rel="noreferrer">
                    <MessageCircle size={14} /> WhatsApp
                  </a>
                </div>
              </div>
            </article>
          </div>
          <span className="contact-decoration" aria-hidden="true">F</span>
        </section>
          </>
        )}
      </main>

      <footer className="site-footer">
        <div className="footer-main">
          <div className="footer-brand">
            <a className="wordmark wordmark-light" href={isArticlesPage ? "/#accueil" : "#accueil"}><BrandWordmark name={brand.name.toUpperCase()} /></a>
            <p>{story.short}</p>
          </div>
          <div className="footer-column">
            <span className="footer-label">EXPLORER</span>
            <a href="#articles">Toutes les trouvailles</a><a href={isArticlesPage ? "/#histoire" : "#histoire"}>Notre histoire</a><a href={isArticlesPage ? "/#livraison" : "#livraison"}>Livraison à Dakar</a>
            <a href="/client">Mon espace client</a>
            <a href="/driver">Espace livreur</a>
          </div>
          <div className="footer-column">
            <span className="footer-label">NOUS ÉCRIRE</span>
            <a href={`https://wa.me/${contactPhone}`} target="_blank" rel="noreferrer">{contactDisplay}</a>
            <a href={`mailto:${brand.email}`}>{brand.email}</a>
            <span>{brand.origin}</span>
          </div>
          <div className="footer-meta">
            <a className="instagram-link" href="#articles" aria-label="Voir toutes les trouvailles">
              <Camera size={18} /><span>Voir toutes les trouvailles</span><ArrowUpRight size={15} />
            </a>
            <div className="creator-credit">
              <span>CONCEPTION & DÉVELOPPEMENT</span>
              <strong>MULTI BRAIN TECH</strong>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} {brand.name} · Fait avec soin à Dakar</span>
          <span>WAVE & ORANGE MONEY · PAIEMENT À CONFIRMER AVEC FATOU</span>
          <a href="#accueil">REMONTER ↑</a>
        </div>
      </footer>

      {notice && <div className="toast" role="status"><Check size={16} />{notice}</div>}
      <VisitorAssistant brand={brand} contactDisplay={contactDisplay} />
      {isOrderOpen && (
        <OrderModal
          cart={cart}
          setCart={setCart}
          close={() => setIsOrderOpen(false)}
          addNotice={(message) => setNotice(message)}
          deliveryZones={deliveryZones}
          storeLocation={storefront?.settings?.store_location || { latitude: 14.712, longitude: -17.454 }}
        />
      )}
    </>
  );
}

export default App;

const assistantReplies = {
  fr: {
    greeting: "Bonjour ! Je peux vous renseigner sur les articles, la livraison à Dakar, les commandes et les paiements. Que souhaitez-vous savoir ?",
    products: "La vitrine présente des sacs, de la mode, des bijoux et des accessoires choisis aux États-Unis. Les prix et disponibilités affichés sont indicatifs : Fatou les confirme avec vous.",
    delivery: "La boutique est à Dieuppeul-Derklé, Dakar, et livre dans plusieurs quartiers. Les frais affichés sont indicatifs et seront confirmés avec Fatou lors de la commande.",
    payment: "Le paiement n’est pas intégré au site. Pour Wave ou Orange Money, contactez Fatou sur WhatsApp et suivez ses instructions. La commande et le paiement seront confirmés avec elle.",
    order: "Ajoutez vos articles à « Ma sélection », puis ouvrez le formulaire de commande pour indiquer vos coordonnées et votre quartier. Le récapitulatif s’ouvre ensuite dans WhatsApp pour confirmation avec Fatou.",
    contact: "Vous pouvez appeler ou écrire à Fatou sur WhatsApp, ou lui envoyer un e-mail.",
    origin: "Fatou Shop propose une sélection de produits venant des États-Unis, avec une boutique située à Dieuppeul-Derklé, Dakar.",
    fallback: "Je peux aider sur les articles, les commandes, la livraison, les paiements et les coordonnées de Fatou. Pour une autre question, contactez-la sur WhatsApp au 77 736 44 27.",
  },
  wo: {
    greeting: "Salaam! Maa ngi fi ngir dimbali la ci Fatou Shop. Lan nga bëgg xam?",
    products: "Fatou Shop am na ay bolso, yére, biju ak akseswaar yu ñu tànn ci Amerik. Njëg yi ak li am ci site bi, Fatou mooy dëggal ko.",
    delivery: "Fatou Shop nekk na Dieuppeul-Derklé, Dakar, te dafay yóbbu ci ay quartier. Njëg yóbbu yi ci site bi, Fatou mooy dëggal ko.",
    payment: "Fey bi ñu ngi ko dëppale ak Fatou ci WhatsApp. Site bi du jël xaalis walla sa capture ci yoon wu automatik. Waxal ak Fatou ngir xam ni ngay feyee ci Wave walla Orange Money.",
    order: "Tànnal sa yëf yi, nga dugal sa tur, sa telefon ak quartier bi nga dëkk. Gannaaw loolu, site bi dina la ubbi WhatsApp ngir nga dëppale sa commandes ak Fatou.",
    contact: "Mën nga woo Fatou walla nga wax ak moom ci WhatsApp. Mën nga itam yónnee ko email.",
    origin: "Fatou Shop dafay tànn yëf yu jóge ci Amerik. Boutique bi nekk na Dieuppeul-Derklé, Dakar.",
    fallback: "Mën naa la dimbali ci yëf yi, commandes, yóbbu, fey ak nimero Fatou. Soo amee laaj bu dul loolu, waxal ak moom ci WhatsApp: 77 736 44 27.",
  },
};

function getAssistantReply(question, language, brand) {
  const normalized = question
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const topics = [
    { key: "delivery", words: ["livraison", "livrer", "quartier", "frais", "yobbu", "yóbbu", "dakar"] },
    { key: "payment", words: ["paiement", "payer", "wave", "orange", "money", "fey", "xalis"] },
    { key: "order", words: ["commande", "commander", "panier", "selection", "acheter", "achat"] },
    { key: "contact", words: ["contact", "telephone", "numero", "appel", "appeler", "whatsapp", "email", "mail"] },
    { key: "origin", words: ["usa", "amerique", "etats-unis", "origine", "fatou shop"] },
    { key: "products", words: ["produit", "article", "sac", "mode", "bijou", "accessoire", "prix", "disponible"] },
  ];
  const topic = topics.find(({ words }) => words.some((word) => normalized.includes(word)));
  if (topic?.key === "contact") {
    return language === "fr"
      ? `Vous pouvez appeler ou écrire à Fatou sur WhatsApp au ${formatPhoneNumber(brand.phone)}, ou lui envoyer un e-mail à ${brand.email}.`
      : `Mën nga woo Fatou walla nga wax ak moom ci WhatsApp ci nimero ${formatPhoneNumber(brand.phone)}. Mën nga itam yónnee ko email ci ${brand.email}.`;
  }
  if (topic?.key === "origin") {
    return language === "fr"
      ? `${brand.name} propose une sélection de produits venant des États-Unis, avec une boutique située à ${brand.origin}.`
      : `${brand.name} dafay tànn yëf yu jóge ci Amerik. Boutique bi nekk na ${brand.origin}.`;
  }
  return assistantReplies[language][topic?.key || "fallback"];
}

function VisitorAssistant({ brand }) {
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState("fr");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [voiceMessage, setVoiceMessage] = useState("");
  const [listening, setListening] = useState(false);
  const messageListRef = useRef(null);
  const text = language === "fr"
    ? {
        title: "L’assistant Fatou",
        subtitle: "Français · Wolof",
        placeholder: "Écrivez votre question…",
        send: "Envoyer",
        listen: "Parler",
        hear: "Écouter la réponse",
        disclaimer: "Assistant FAQ · réponses prédéfinies, sans IA générative. La voix dépend de votre appareil.",
        suggestions: ["Livraison à Dakar ?", "Comment commander ?", "Quels paiements ?"],
        voiceUnavailable: "Aucune voix disponible pour cette langue sur cet appareil.",
        speechUnavailable: "La lecture vocale n’est pas disponible dans ce navigateur.",
        recognitionUnavailable: "La saisie vocale n’est pas disponible dans ce navigateur.",
        recognitionError: "La reconnaissance vocale n’a pas fonctionné. Vous pouvez écrire votre question.",
        userLabel: "Vous",
        assistantLabel: "Assistant",
      }
    : {
        title: "Dimbali bu Fatou",
        subtitle: "Wolof · Français",
        placeholder: "Bindal sa laaj…",
        send: "Yónnee",
        listen: "Wax",
        hear: "Déglu tontu bi",
        disclaimer: "Tontu yi ñu bind ba noppi. Baaxug baat bi aju na ci sa telefon walla ordinateur.",
        suggestions: ["Yóbbu ci Dakar ?", "Nan laa commande ?", "Nan laa fey ?"],
        voiceUnavailable: "Baatu Wolof bi amul ci sa telefon walla ordinateur.",
        speechUnavailable: "Telefon bi manula wax Wolof ci navigateur bi.",
        recognitionUnavailable: "Nanu manula dégg sa baat ci navigateur bi. Bindal sa laaj.",
        recognitionError: "Dégg baat bi antuwul. Mën nga bind sa laaj.",
        userLabel: "Yow",
        assistantLabel: "Dimbali",
      };

  useEffect(() => {
    if (isOpen && messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [isOpen, messages]);

  useEffect(() => () => {
    window.speechSynthesis?.cancel();
  }, []);

  function submitQuestion(value = question) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setMessages((current) => [
      ...current,
      { id: `${Date.now()}-user`, role: "user", content: trimmed },
      { id: `${Date.now()}-assistant`, role: "assistant", content: getAssistantReply(trimmed, language, brand) },
    ]);
    setQuestion("");
    setVoiceMessage("");
  }

  function speak(content) {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setVoiceMessage(text.speechUnavailable);
      return;
    }
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((item) => item.lang.toLowerCase().startsWith(language === "fr" ? "fr" : "wo"));
    if (!voice) {
      setVoiceMessage(text.voiceUnavailable);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = voice.lang;
    utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
    setVoiceMessage("");
  }

  function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceMessage(text.recognitionUnavailable);
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = language === "fr" ? "fr-SN" : "wo-SN";
      recognition.interimResults = false;
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setQuestion(transcript);
        setListening(false);
        setVoiceMessage("");
      };
      recognition.onerror = () => {
        setListening(false);
        setVoiceMessage(text.recognitionError);
      };
      recognition.onend = () => setListening(false);
      recognition.start();
      setListening(true);
      setVoiceMessage("");
    } catch {
      setListening(false);
      setVoiceMessage(text.recognitionError);
    }
  }

  return (
    <div className="visitor-assistant">
      {isOpen && (
        <section className="assistant-panel" aria-label={text.title}>
          <header className="assistant-header">
            <div className="assistant-avatar"><Sparkles size={18} /></div>
            <div className="assistant-heading">
              <strong>{text.title}</strong>
              <span>{text.subtitle}</span>
            </div>
            <button className="assistant-close" type="button" onClick={() => setIsOpen(false)} aria-label="Fermer l’assistant">
              <X size={18} />
            </button>
          </header>
          <div className="assistant-language" aria-label="Choisir la langue">
            <button type="button" className={language === "fr" ? "active" : ""} onClick={() => { setLanguage("fr"); setVoiceMessage(""); }}>Français</button>
            <button type="button" className={language === "wo" ? "active" : ""} onClick={() => { setLanguage("wo"); setVoiceMessage(""); }}>Wolof</button>
          </div>
          <div className="assistant-messages" ref={messageListRef} aria-live="polite">
            <div className="assistant-welcome">
              <span className="assistant-role">{text.assistantLabel}</span>
              <p>{assistantReplies[language].greeting}</p>
            </div>
            {messages.map((message) => (
              <article className={`assistant-message ${message.role}`} key={message.id}>
                <span className="assistant-role">{message.role === "user" ? text.userLabel : text.assistantLabel}</span>
                <p>{message.content}</p>
                {message.role === "assistant" && (
                  <button className="assistant-listen" type="button" onClick={() => speak(message.content)}>
                    <Volume2 size={13} /> {text.hear}
                  </button>
                )}
              </article>
            ))}
          </div>
          {messages.length === 0 && (
            <div className="assistant-suggestions">
              {text.suggestions.map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => submitQuestion(suggestion)}>{suggestion}</button>
              ))}
            </div>
          )}
          {voiceMessage && <p className="assistant-status" role="status">{voiceMessage}</p>}
          <form className="assistant-form" onSubmit={(event) => { event.preventDefault(); submitQuestion(); }}>
            <button className={`assistant-mic${listening ? " listening" : ""}`} type="button" onClick={startVoiceInput} aria-label={text.listen} title={text.listen}>
              <Mic size={17} />
            </button>
            <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={text.placeholder} aria-label={text.placeholder} />
            <button className="assistant-send" type="submit" disabled={!question.trim()} aria-label={text.send} title={text.send}>
              <Send size={17} />
            </button>
          </form>
          <p className="assistant-disclaimer">{text.disclaimer}</p>
        </section>
      )}
      <button className={`assistant-launcher${isOpen ? " is-open" : ""}`} type="button" onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen} aria-label={isOpen ? "Fermer l’assistant Fatou" : "Parler à l’assistant Fatou"}>
        {isOpen ? <X size={23} /> : <MessageCircle size={23} />}
        {!isOpen && <span>Besoin d’aide ?</span>}
      </button>
    </div>
  );
}

function ArticlesPage({ activeCategory, setActiveCategory, products: catalog, addToCart, brand, contactPhone, contactDisplay, categoryOptions }) {
  return (
    <section className="catalog-page" id="articles">
      <div className="catalog-hero">
        <div className="catalog-hero-visual">
          <div className="catalog-product-orbit" aria-hidden="true">
            {catalog.slice(0, 4).map((product, index) => (
              <span
                className="orbit-product"
                key={product.id}
                style={{ "--orbit-delay": `${-index * 4.5}s` }}
              >
                <img src={product.image} alt="" />
              </span>
            ))}
          </div>
          <div className="catalog-portrait">
            <img src="/bfa.jpeg" alt={`Fatou, fondatrice de ${brand.name}`} />
          </div>
        </div>
        <div className="catalog-flight" aria-hidden="true">
          <span className="flight-trail" />
          <Plane size={24} strokeWidth={1.5} />
        </div>
        <div className="catalog-hero-copy">
          <a className="catalog-back-link" href="/#accueil"><ArrowDownRight size={14} /> Retour à l’accueil</a>
          <div className="eyebrow"><span className="eyebrow-dot" /> La sélection {brand.name}</div>
          <h1>Toutes nos<br /><em>trouvailles.</em></h1>
          <p>Des pièces choisies aux États-Unis, à découvrir tranquillement, une par une.</p>
        </div>
        <span className="catalog-hero-note">USA <ArrowRight size={14} /> DAKAR</span>
      </div>

      <div className="catalog-content">
        <div className="catalog-toolbar">
          <div className="catalog-tabs" aria-label="Filtrer les articles par catégorie">
            {categoryOptions.map((category) => (
              <button
                key={category}
                className={activeCategory === category ? "category-tab active" : "category-tab"}
                onClick={() => setActiveCategory(category)}
                aria-pressed={activeCategory === category}
              >
                {category}
              </button>
            ))}
          </div>
          <span className="catalog-result-count">{String(catalog.length).padStart(2, "0")} ARTICLES</span>
        </div>

        <div className="catalog-grid">
          {catalog.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              index={index}
              addToCart={addToCart}
            />
          ))}
        </div>
        <p className="catalog-note">Une question sur une pièce ? Écrivez-nous au <a href={`https://wa.me/${contactPhone}`} target="_blank" rel="noreferrer">{contactDisplay}</a>.</p>
      </div>
    </section>
  );
}

function ProductCard({ product, index, addToCart, compact = false }) {
  const outOfStock = typeof product.stock === "number" && product.stock <= 0;
  const lowStock = product.low_stock ?? (typeof product.stock === "number" && product.stock > 0 && product.stock <= 3);

  return (
    <article
      id={`product-${product.id}`}
      className={`product-card catalog-card${compact ? " compact-card" : ""}`}
      style={{ "--card-index": index }}
    >
      <div className={`product-image ${product.tone}`}>
        <img src={product.image} alt={product.alt} loading="lazy" />
        <span className="product-label">{product.label}</span>
        {typeof product.stock === "number" && <span className={`product-stock-badge${outOfStock ? " out" : lowStock ? " low" : ""}`}>
          {outOfStock ? "Épuisé" : lowStock ? `Plus que ${product.stock}` : "En stock"}
        </span>}
        <span className="product-index">{String(product.id).padStart(2, "0")}</span>
        <button
          className="product-add"
          aria-label={`Ajouter ${product.name} à la sélection`}
          disabled={outOfStock}
          onClick={() => addToCart(product)}
        >
          <Plus size={19} />
        </button>
      </div>
      <div className="product-info">
        <div className="product-copy">
          <span className="product-category">{product.category}</span>
          <h3>{product.name}</h3>
          {!compact && <p className="catalog-product-description">{product.description}</p>}
        </div>
        <div className="product-prices">
          {product.oldPrice && <s>{formatPrice(product.oldPrice)}</s>}
          <span>{formatPrice(product.price)}</span>
        </div>
      </div>
      {!compact && (
        <button className="catalog-add-button" disabled={outOfStock} onClick={() => addToCart(product)}>
          {outOfStock ? "Indisponible" : "Ajouter à ma sélection"} {!outOfStock && <ArrowUpRight size={15} />}
        </button>
      )}
    </article>
  );
}

function OrderModal({ cart, setCart, close, addNotice, deliveryZones, storeLocation }) {
  const [district, setDistrict] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState("details");
  const [accountMode, setAccountMode] = useState("register");
  const [draft, setDraft] = useState(null);
  const [savedOrder, setSavedOrder] = useState(null);
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [deliveryLocationConfirmed, setDeliveryLocationConfirmed] = useState(false);

  const selectedZone = deliveryZones.find((zone) => String(zone.id) === district);
  const selectedFee = selectedZone?.fee || 0;
  const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const total = subtotal + selectedFee;
  const hasItems = cart.length > 0;

  function chooseDeliveryLocation(location) {
    setDeliveryLocation(location);
    setDeliveryLocationConfirmed(false);
  }

  function updateQuantity(productId, delta) {
    const item = cart.find((entry) => entry.id === productId);
    if (delta > 0 && item && typeof item.stock === "number" && item.quantity >= item.stock) {
      setFormError(`Stock disponible : ${item.stock} unité(s) de ${item.name}`);
      return;
    }
    setFormError("");
    setCart((current) =>
      current
        .map((item) =>
          item.id === productId
            ? { ...item, quantity: item.quantity + delta }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function prepareOrder(event) {
    event.preventDefault();
    setFormError("");
    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("fullName") || "").trim();
    const phone = String(formData.get("phone") || "").replace(/[\s-]/g, "");
    const address = String(formData.get("address") || "").trim();
    const payerName = String(formData.get("payerName") || "").trim();
    const payerPhone = String(formData.get("payerPhone") || "").replace(/[\s-]/g, "");
    const proof = formData.get("proof");

    if (!hasItems) {
      setFormError("Ajoutez au moins une pièce à votre sélection.");
      return;
    }
    const unavailableItem = cart.find((item) => typeof item.stock === "number" && item.quantity > item.stock);
    if (unavailableItem) {
      setFormError(unavailableItem.stock > 0
        ? `Stock disponible : ${unavailableItem.stock} unité(s) de ${unavailableItem.name}.`
        : `${unavailableItem.name} est en rupture de stock.`);
      return;
    }
    if (!district) {
      setFormError("Choisissez votre quartier pour calculer la livraison.");
      return;
    }
    if (!deliveryLocation || !deliveryLocationConfirmed) {
      setFormError("Placez le repère sur la carte et confirmez que l’adresse correspond à votre lieu de livraison.");
      return;
    }
    if (!/^(?:\+?221)?(?:70|75|76|77|78)\d{7}$/.test(phone)) {
      setFormError("Entrez un numéro sénégalais valide, par exemple 77 123 45 67.");
      return;
    }
    if (alreadyPaid && !paymentMethod) {
      setFormError("Choisissez Wave ou Orange Money pour indiquer le paiement.");
      return;
    }
    if (alreadyPaid && !/^(?:\+?221)?(?:70|75|76|77|78)\d{7}$/.test(payerPhone)) {
      setFormError("Entrez le numéro sénégalais utilisé pour le paiement.");
      return;
    }
    if (alreadyPaid && !payerName) {
      setFormError("Indiquez le nom affiché sur le compte de paiement.");
      return;
    }
    if (alreadyPaid && !(proof instanceof File && proof.size > 0)) {
      setFormError("Ajoutez la capture de paiement pour l’envoyer avec la commande.");
      return;
    }

    const orderDraft = { fullName, phone, address, payerName, payerPhone, proof, deliveryLocation };
    setDraft(orderDraft);
    void placeOrder(orderDraft);
  }

  async function placeOrder(orderDraft) {
    if (!orderDraft || !selectedZone) {
      setFormError("Vérifiez les coordonnées et le quartier de livraison.");
      return;
    }

    const request = new FormData();
    request.append("customer_name", orderDraft.fullName);
    request.append("customer_phone", orderDraft.phone);
    request.append("delivery_zone_id", String(selectedZone.id));
    request.append("delivery_address", orderDraft.address);
    request.append("delivery_latitude", String(orderDraft.deliveryLocation.latitude));
    request.append("delivery_longitude", String(orderDraft.deliveryLocation.longitude));
    cart.forEach((item, index) => {
      request.append(`items[${index}][product_id]`, String(item.id));
      request.append(`items[${index}][quantity]`, String(item.quantity));
    });
    if (alreadyPaid) {
      request.append("payment_method", paymentMethod === "Wave" ? "wave" : "orange_money");
      request.append("payer_name", orderDraft.payerName);
      request.append("payer_phone", orderDraft.payerPhone);
      request.append("proof", orderDraft.proof);
    }

    setIsSubmitting(true);
    try {
      const result = await api("/orders", { method: "POST", body: request });
      setSavedOrder(result.order);
      setCheckoutStep("choice");
      setFormError("");
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "La commande n’a pas pu être enregistrée.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function continueAsGuest() {
    setCart([]);
    addNotice(`Commande ${savedOrder?.reference || ""} enregistrée. Fatou vous contactera pour la confirmer.`);
    close();
  }

  async function continueWithAccount(event) {
    event.preventDefault();
    setFormError("");
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("accountPassword") || "");
    setIsSubmitting(true);

    try {
      let result;
      if (accountMode === "register") {
        result = await api("/client/register", {
          method: "POST",
          body: {
            name: draft.fullName,
            phone: draft.phone,
            password,
            password_confirmation: String(formData.get("accountPasswordConfirmation") || ""),
            referral_code: String(formData.get("accountReferralCode") || "").trim() || null,
          },
        });
      } else {
        result = await api("/client/login", { method: "POST", body: { phone: draft.phone, password } });
      }

      const accountPhone = String(result.user.phone || "").replace(/\D/g, "");
      const orderPhone = draft.phone.replace(/\D/g, "").replace(/^221/, "");
      if (accountPhone !== orderPhone) throw new Error("Connectez-vous avec le compte associé au numéro de téléphone de cette commande.");
      await api("/client/orders/claim-pending", { method: "POST" });
      setCart([]);
      window.location.assign("/client");
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "La connexion au compte client a échoué.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) close();
    }}>
      <section className="order-modal" role="dialog" aria-modal="true" aria-labelledby="order-title">
        <div className="modal-heading">
          <div><span className="eyebrow"><span className="eyebrow-dot" /> Votre sélection</span><h2 id="order-title">On vous <em>écoute.</em></h2></div>
          <button className="modal-close" onClick={close} aria-label="Fermer"><X size={19} /></button>
        </div>
        {!hasItems && (
          <div className="empty-cart">
            <span className="empty-cart-icon"><ShoppingBag size={24} /></span>
            <h3>Pas encore de coup de cœur ?</h3>
            <p>Choisissez vos pièces préférées dans la collection, elles vous attendent.</p>
            <button className="button button-dark" onClick={close}>Voir la collection <ArrowDownRight size={15} /></button>
          </div>
        )}
        {hasItems && (
          <form className="order-form" onSubmit={(event) => {
            if (checkoutStep === "details") void prepareOrder(event);
            else if (checkoutStep === "account") void continueWithAccount(event);
            else event.preventDefault();
          }}>
            {formError && <p className="form-error" role="alert">{formError}</p>}
            {checkoutStep === "choice" && (
              <section className="checkout-account-choice">
                <span className="eyebrow"><span className="eyebrow-dot" /> COMMANDE ENREGISTRÉE</span>
                <h3>Merci pour votre commande.</h3>
                <p>Votre commande <strong>{savedOrder?.reference}</strong> a bien été enregistrée. Aucun paiement n’est prélevé en ligne. Choisissez si vous souhaitez suivre cette commande depuis un espace client.</p>
                <div className="checkout-choice-actions">
                  {savedOrder?.account_linked ? (
                    <button type="button" className="button button-dark" onClick={() => { setCart([]); window.location.assign("/client"); }}>Voir ma commande dans mon espace client</button>
                  ) : (
                    <>
                      <button type="button" className="button button-dark" onClick={() => { setAccountMode("register"); setCheckoutStep("account"); }}>Créer mon compte et suivre ma commande</button>
                      <button type="button" className="checkout-login-link" onClick={() => { setAccountMode("login"); setCheckoutStep("account"); }}>J’ai déjà un compte</button>
                    </>
                  )}
                  <button type="button" className="button button-outline" onClick={continueAsGuest}>Terminer sans compte</button>
                </div>
              </section>
            )}
            {checkoutStep === "account" && (
              <section className="checkout-account-choice">
                <button type="button" className="checkout-login-link" onClick={() => setCheckoutStep("choice")}>← Retour au choix</button>
                <h3>{accountMode === "register" ? "Créer votre espace client" : "Connectez-vous à votre compte"}</h3>
                <p>Votre commande sera liée au compte utilisant le numéro {draft?.phone}. {accountMode === "register" ? "Choisissez un mot de passe pour suivre vos commandes et partager votre code de parrainage." : "Utilisez le compte associé à ce numéro."}</p>
                {accountMode === "register" && <label className="field-label">Code d’invitation (facultatif)<input name="accountReferralCode" maxLength="20" placeholder="Code partagé par un proche" /></label>}
                <label className="field-label">Mot de passe<input name="accountPassword" type="password" autoComplete={accountMode === "register" ? "new-password" : "current-password"} minLength={accountMode === "register" ? 10 : undefined} required /></label>
                {accountMode === "register" && <label className="field-label">Confirmer le mot de passe<input name="accountPasswordConfirmation" type="password" autoComplete="new-password" minLength="10" required /></label>}
                <button className="button button-dark submit-order" type="submit" disabled={isSubmitting}>{isSubmitting ? "Veuillez patienter…" : accountMode === "register" ? "Créer le compte et ouvrir mon espace" : "Me connecter et ouvrir mon espace"} <ArrowRight size={16} /></button>
                <button type="button" className="checkout-login-link" onClick={() => setAccountMode(accountMode === "register" ? "login" : "register")}>{accountMode === "register" ? "J’ai déjà un compte" : "Créer un nouveau compte"}</button>
              </section>
            )}
            <fieldset
              className="checkout-details"
              disabled={checkoutStep !== "details"}
              style={{ display: checkoutStep === "details" ? undefined : "none" }}
            >
            <div className="order-lines">
              {cart.map((item) => (
                <div className="order-line" key={item.id}>
                  <img src={item.image} alt="" />
                  <div className="order-line-info"><strong>{item.name}</strong><span>{formatPrice(item.price)}</span></div>
                  <div className="quantity-control">
                    <button type="button" onClick={() => updateQuantity(item.id, -1)} aria-label={`Retirer un ${item.name}`}>−</button>
                    <span>{item.quantity}</span>
                    <button type="button" disabled={typeof item.stock === "number" && item.quantity >= item.stock} onClick={() => updateQuantity(item.id, 1)} aria-label={`Ajouter un ${item.name}`}>+</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="form-section-title"><span>01</span> VOS COORDONNÉES</div>
            <label className="field-label">Nom complet
              <input name="fullName" type="text" autoComplete="name" placeholder="Ex. Aïssatou Ndiaye" required />
            </label>
            <label className="field-label">Téléphone sénégalais
              <div className="phone-input"><span>🇸🇳 +221</span><input name="phone" type="tel" autoComplete="tel-national" placeholder="77 123 45 67" required /></div>
            </label>
            <label className="field-label">Quartier de livraison
              <div className="select-wrap"><select value={district} onChange={(event) => setDistrict(event.target.value)} required>
                <option value="">Choisir un quartier</option>
                {deliveryZones.map((zone) => (
                  <option value={zone.id} key={zone.id}>{zone.name} — {formatPrice(zone.fee)}</option>
                ))}
              </select><ChevronDown size={16} /></div>
            </label>
            <label className="field-label">Adresse, rue ou repère
              <input name="address" type="text" autoComplete="street-address" placeholder="Ex. près de la pharmacie…" required />
            </label>
            <div className="field-label delivery-address-map-label">
              <span>Confirmez votre emplacement exact sur la carte</span>
              <button type="button" className="use-current-location" onClick={() => {
                if (!navigator.geolocation) {
                  setFormError("La géolocalisation n’est pas disponible sur cet appareil.");
                  return;
                }
                navigator.geolocation.getCurrentPosition(
                  ({ coords }) => {
                    chooseDeliveryLocation({ latitude: coords.latitude, longitude: coords.longitude });
                    setFormError("");
                  },
                  () => setFormError("Position GPS indisponible. Touchez la carte pour placer le repère manuellement."),
                  { enableHighAccuracy: true, timeout: 12000 },
                );
              }}><MapPin size={14} /> Utiliser ma position</button>
              <DeliveryMap storeLocation={storeLocation} customerLocation={deliveryLocation} interactive onPick={chooseDeliveryLocation} />
              {deliveryLocation && <small>Position choisie : {deliveryLocation.latitude.toFixed(5)}, {deliveryLocation.longitude.toFixed(5)}</small>}
              <label className="delivery-location-confirm">
                <input type="checkbox" checked={deliveryLocationConfirmed} onChange={(event) => setDeliveryLocationConfirmed(event.target.checked)} />
                Je confirme que le repère indique bien mon lieu de livraison.
              </label>
            </div>

            <div className="form-section-title payment-title"><span>02</span> PAIEMENT APRÈS CONFIRMATION</div>
            <p className="payment-explainer">Wave ou Orange Money par transfert direct. Envoyez d’abord votre commande : Fatou confirme la disponibilité et vous communique le numéro de paiement.</p>
            <label className="paid-toggle">
              <input type="checkbox" checked={alreadyPaid} onChange={(event) => {
                setAlreadyPaid(event.target.checked);
                setPaymentMethod("");
              }} />
              <span>J’ai déjà effectué le paiement et je veux envoyer mon justificatif</span>
            </label>
            {alreadyPaid && (
              <div className="payment-fields">
                <div className="payment-options">
                  {["Wave", "Orange Money"].map((method) => (
                    <button type="button" className={paymentMethod === method ? "payment-option selected" : "payment-option"} onClick={() => setPaymentMethod(method)} key={method}>
                      <span className={`payment-logo ${method === "Wave" ? "wave-logo" : "orange-logo"}`}>{method === "Wave" ? "W" : "OM"}</span>
                      {method}
                      {paymentMethod === method && <Check size={15} />}
                    </button>
                  ))}
                </div>
                {paymentMethod && (
                  <>
                    <label className="field-label">Nom affiché sur le compte {paymentMethod}
                      <input name="payerName" type="text" placeholder="Nom du titulaire" required />
                    </label>
                    <label className="field-label">Numéro utilisé pour le paiement
                      <div className="phone-input"><span>🇸🇳 +221</span><input name="payerPhone" type="tel" placeholder="77 123 45 67" required /></div>
                    </label>
                    <label className="field-label">Capture d’écran du paiement
                      <input className="proof-input" type="file" name="proof" accept="image/*" required />
                      <span className="file-hint">La capture est envoyée à la boutique pour validation et reste privée.</span>
                    </label>
                  </>
                )}
              </div>
            )}

            <div className="order-total">
              <div><span>Sous-total</span><strong>{formatPrice(subtotal)}</strong></div>
              <div><span>Livraison {district && `· ${district}`}</span><strong>{district ? formatPrice(selectedFee) : "À calculer"}</strong></div>
              <div className="grand-total"><span>Total estimé</span><strong>{district ? formatPrice(total) : formatPrice(subtotal)}</strong></div>
            </div>
            <p className="order-privacy">Votre commande sera enregistrée de manière sécurisée. Aucun paiement n’est prélevé en ligne ; la boutique la confirmera ensuite. Vous pourrez choisir de créer un espace client après validation.</p>
            {formError && <p className="form-error" role="alert">{formError}</p>}
            <button className="button button-dark submit-order" type="submit" disabled={isSubmitting}>{isSubmitting ? "Enregistrement de la commande…" : "Valider ma commande"} <ArrowRight size={16} /></button>
            </fieldset>
          </form>
        )}
      </section>
    </div>
  );
}
