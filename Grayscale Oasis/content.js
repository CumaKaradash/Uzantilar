class ContentManager {
    constructor() {
        this.settings = {
            grayscaleOasis: false,
            language: 'tr',
            darkTheme: false
        };
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.applyGrayscale();
        this.setupMessageListener();
        this.injectStyles();
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(this.settings);
            this.settings = { ...this.settings, ...result };
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    applyGrayscale() {
        const element = document.documentElement || document.body;
        if (this.settings.grayscaleOasis) {
            element.classList.add('sovereign-grayscale');
        } else {
            element.classList.remove('sovereign-grayscale');
        }
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'updateSettings') {
                this.settings = { ...this.settings, ...message.settings };
                this.applyGrayscale();
                sendResponse({ success: true });
            }
            return true;
        });
    }

    injectStyles() {
        if (document.getElementById('grayscale-oasis-styles')) {
            return;
        }

        const link = document.createElement('link');
        link.id = 'grayscale-oasis-styles';
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = chrome.runtime.getURL('content.css');
        
        (document.head || document.documentElement).appendChild(link);
    }

    async updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.applyGrayscale();
    }
}

new ContentManager();
