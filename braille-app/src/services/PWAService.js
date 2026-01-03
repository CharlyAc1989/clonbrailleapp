/**
 * PWA Service
 * Handles Progressive Web App installation and service worker
 */

export const PWAService = {
    deferredPrompt: null,

    init() {
        this.registerServiceWorker();
        this.setupListeners();
        this.checkStandalone();
    },

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js')
                .then(reg => console.log('SW registered:', reg.scope))
                .catch(err => console.log('SW registration failed:', err));
        }
    },

    setupListeners() {
        // Android / Chrome: Capture the install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showGate();
            this.detectPlatform();
        });

        // Listen for successful install
        window.addEventListener('appinstalled', () => {
            console.log('App was installed');
            this.hideGate();
        });

        // Primary install button (Android)
        const installBtn = document.getElementById('install-button');
        if (installBtn) {
            installBtn.addEventListener('click', async () => {
                if (this.deferredPrompt) {
                    this.deferredPrompt.prompt();
                    const { outcome } = await this.deferredPrompt.userChoice;
                    console.log(`User response to install: ${outcome}`);
                    this.deferredPrompt = null;

                    if (outcome === 'accepted') {
                        installBtn.textContent = '¡Instalada! Ábrela desde tu inicio.';
                        installBtn.disabled = true;
                    }
                }
            });
        }

        // Bypass button
        const bypassBtn = document.getElementById('bypass-install-btn');
        if (bypassBtn) {
            bypassBtn.addEventListener('click', () => {
                this.hideGate();
            });
        }
    },

    checkStandalone() {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone === true;

        if (isStandalone) {
            this.hideGate();
            return true;
        }

        // Show banner for non-standalone
        this.showGate();
        this.detectPlatform();
        return false;
    },

    detectPlatform() {
        const ua = window.navigator.userAgent;
        const isIOS = /iPhone|iPad|iPod/.test(ua);

        if (isIOS) {
            // Show iOS hint instead of install button
            document.getElementById('install-button')?.classList.add('hidden');
            document.getElementById('ios-hint')?.classList.remove('hidden');
        }
    },

    showGate() {
        const banner = document.getElementById('install-banner');
        if (banner) {
            banner.classList.remove('hidden');
        }
    },

    hideGate() {
        const banner = document.getElementById('install-banner');
        if (banner) {
            banner.classList.add('hidden');
        }
    }
};

export default PWAService;
