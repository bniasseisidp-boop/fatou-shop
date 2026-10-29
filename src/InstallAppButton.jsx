import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
}

function getInstallInstructions() {
  const isAppleMobile = /iPad|iPhone|iPod/.test(window.navigator.userAgent)
    || (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);

  if (isAppleMobile) {
    return "Dans Safari, touchez Partager, puis « Sur l’écran d’accueil ».";
  }

  if (/Android/i.test(window.navigator.userAgent)) {
    return "Ouvrez le menu ⋮ du navigateur, puis choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ».";
  }

  return "Ouvrez le menu de votre navigateur et choisissez « Installer Fatou Shop » ou « Installer cette page comme application ».";
}

export default function InstallAppButton() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(isStandalone);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    function handleInstallPrompt(event) {
      event.preventDefault();
      setInstallPrompt(event);
    }

    function handleInstalled() {
      setIsInstalled(true);
      setInstallPrompt(null);
      setShowInstructions(false);
    }

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (isInstalled) return null;

  async function installApp() {
    if (!installPrompt) {
      setShowInstructions((visible) => !visible);
      return;
    }

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") setIsInstalled(true);
      setInstallPrompt(null);
    } catch (error) {
      console.error("L'installation de Fatou Shop n'a pas abouti.", error);
    }
  }

  return (
    <aside className="pwa-install">
      {showInstructions && (
        <div className="pwa-install-help" role="status">
          <button
            className="pwa-install-close"
            type="button"
            aria-label="Fermer les instructions"
            onClick={() => setShowInstructions(false)}
          >
            <X size={15} />
          </button>
          <strong>Installer Fatou Shop</strong>
          <p>{getInstallInstructions()}</p>
        </div>
      )}
      <button
        className="pwa-install-button"
        type="button"
        aria-expanded={showInstructions}
        onClick={installApp}
      >
        <Download size={17} />
        <span>Installer l’application</span>
      </button>
    </aside>
  );
}
