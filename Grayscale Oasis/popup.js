class PopupManager {
    constructor() {
        this.settings = {
            grayscaleOasis: false,
            language: 'tr',
            darkTheme: false
        };
        this.currentLang = 'tr';
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.setupEventListeners();
        this.updateUI();
        this.applyLanguage();
        this.applyTheme();
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(this.settings);
            this.settings = { ...this.settings, ...result };
            this.currentLang = this.settings.language || 'tr';
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    setupEventListeners() {
        const grayscaleOasisToggle = document.getElementById('grayscaleOasis');
        if (grayscaleOasisToggle) {
            grayscaleOasisToggle.addEventListener('change', (e) => {
                this.updateSetting('grayscaleOasis', e.target.checked);
            });
        }

        const langToggle = document.getElementById('langToggle');
        if (langToggle) {
            langToggle.addEventListener('click', () => {
                this.toggleLanguage();
            });
        }

        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
    }

    async updateSetting(key, value) {
        this.settings[key] = value;
        try {
            await chrome.storage.sync.set({ [key]: value });
            this.notifyContentScript();
        } catch (error) {
            console.error('Error saving setting:', error);
        }
    }

    toggleLanguage() {
        this.currentLang = this.currentLang === 'tr' ? 'en' : 'tr';
        this.settings.language = this.currentLang;
        this.updateSetting('language', this.currentLang);
        this.applyLanguage();
    }

    toggleTheme() {
        this.settings.darkTheme = !this.settings.darkTheme;
        this.updateSetting('darkTheme', this.settings.darkTheme);
        this.applyTheme();
    }

    applyLanguage() {
        const elements = document.querySelectorAll('[data-tr][data-en]');
        elements.forEach(element => {
            element.textContent = element.getAttribute(`data-${this.currentLang}`);
        });

        const langIcon = document.querySelector('.lang-icon');
        if (langIcon) {
            langIcon.textContent = this.currentLang.toUpperCase();
        }
    }

    applyTheme() {
        const body = document.body;
        const themeIcon = document.querySelector('.theme-icon');
        
        if (this.settings.darkTheme) {
            body.classList.add('dark-theme');
            if (themeIcon) {
                themeIcon.classList.remove('icon-sun');
                themeIcon.classList.add('icon-moon');
            }
        } else {
            body.classList.remove('dark-theme');
            if (themeIcon) {
                themeIcon.classList.remove('icon-moon');
                themeIcon.classList.add('icon-sun');
            }
        }
    }

    updateUI() {
        const grayscaleOasisToggle = document.getElementById('grayscaleOasis');
        if (grayscaleOasisToggle) {
            grayscaleOasisToggle.checked = this.settings.grayscaleOasis;
        }
    }

    notifyContentScript() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'updateSettings',
                    settings: this.settings
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.log('Content script not available:', chrome.runtime.lastError.message);
                    }
                });
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
});
