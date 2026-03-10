// Sovereign Scroll - Popup Script
class SovereignScrollPopup {
    constructor() {
        this.currentLang = 'tr';
        this.currentTheme = 'dark';
        this.settings = {
            scrollLimit: false,
            timeLimit: false,
            awarenessQuestion: false,
            strictMode: false,
            scrollLimitCount: 10,
            timeLimitMinutes: 5
        };
        
        this.init();
    }
    
    async init() {
        await this.loadSettings();
        this.setupEventListeners();
        this.updateUI();
        this.updateStats();
    }
    
    async loadSettings() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
            if (response) {
                this.settings = response.settings;
                this.currentLang = response.lang;
                this.currentTheme = response.theme;
            }
        } catch (error) {
            console.log('Sovereign Scroll: Failed to load settings in popup');
        }
    }
    
    setupEventListeners() {
        // Toggle switches
        document.getElementById('scrollLimit').addEventListener('change', (e) => {
            this.updateSetting('scrollLimit', e.target.checked);
        });
        
        document.getElementById('timeLimit').addEventListener('change', (e) => {
            this.updateSetting('timeLimit', e.target.checked);
        });
        
        document.getElementById('awarenessQuestion').addEventListener('change', (e) => {
            this.updateSetting('awarenessQuestion', e.target.checked);
        });
        
        document.getElementById('strictMode').addEventListener('change', (e) => {
            this.updateSetting('strictMode', e.target.checked);
        });
        
        // Language toggle
        document.getElementById('langToggle').addEventListener('click', () => {
            this.toggleLanguage();
        });
        
        // Theme toggle (placeholder for future implementation)
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // Footer buttons
        document.getElementById('githubBtn').addEventListener('click', () => {
            this.openGitHub();
        });
        
        document.getElementById('coffeeBtn').addEventListener('click', () => {
            this.openCoffeeSupport();
        });
    }
    
    async updateSetting(key, value) {
        this.settings[key] = value;
        
        try {
            await chrome.runtime.sendMessage({
                action: 'updateSettings',
                settings: { [key]: value }
            });
        } catch (error) {
            console.log('Sovereign Scroll: Failed to update setting');
        }
    }
    
    async toggleLanguage() {
        this.currentLang = this.currentLang === 'tr' ? 'en' : 'tr';
        
        try {
            await chrome.runtime.sendMessage({
                action: 'updateLanguage',
                lang: this.currentLang
            });
            
            this.updateLanguage();
        } catch (error) {
            console.log('Sovereign Scroll: Failed to update language');
        }
    }
    
    updateLanguage() {
        // Update all elements with data-tr and data-en attributes
        document.querySelectorAll('[data-tr][data-en]').forEach(element => {
            element.textContent = element.getAttribute(`data-${this.currentLang}`);
        });
        
        // Update language toggle button text
        document.getElementById('langToggle').textContent = this.currentLang === 'tr' ? 'TR/EN' : 'EN/TR';
        
        // Update coffee button text
        const coffeeBtn = document.getElementById('coffeeBtn');
        coffeeBtn.textContent = this.currentLang === 'tr' ? 'Bir kahve ısmarla' : 'Buy me a coffee';
        
        // Update signature
        const signature = document.querySelector('.signature span');
        signature.textContent = this.currentLang === 'tr' 
            ? 'Cuma Karadash tarafından geliştirildi' 
            : 'Developed by Cuma Karadash';
    }
    
    async toggleTheme() {
        // Toggle between 'dark' and 'light'
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        
        // Apply the theme to UI
        this.applyTheme();
        
        // Save the theme to background
        try {
            await chrome.runtime.sendMessage({
                action: 'updateTheme',
                theme: this.currentTheme
            });
        } catch (error) {
            console.log('Sovereign Scroll: Failed to update theme');
        }
    }
    
    updateUI() {
        // Update toggle switches
        document.getElementById('scrollLimit').checked = this.settings.scrollLimit;
        document.getElementById('timeLimit').checked = this.settings.timeLimit;
        document.getElementById('awarenessQuestion').checked = this.settings.awarenessQuestion;
        document.getElementById('strictMode').checked = this.settings.strictMode;
        
        // Update language
        this.updateLanguage();
        
        // Apply theme
        this.applyTheme();
    }
    
    applyTheme() {
        const body = document.body;
        const themeToggle = document.getElementById('themeToggle');
        
        if (this.currentTheme === 'light') {
            body.classList.add('light-theme');
            themeToggle.textContent = '☀️';
        } else {
            body.classList.remove('light-theme');
            themeToggle.textContent = '🌙';
        }
    }
    
    async updateStats() {
        try {
            // Get stats from active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tab && this.isSupportedPlatform(tab.url)) {
                const response = await chrome.tabs.sendMessage(tab.id, {
                    action: 'getState'
                });
                
                if (response) {
                    document.getElementById('scrollCount').textContent = response.scrollCount || 0;
                    document.getElementById('timeSaved').textContent = `${response.timeSaved || 0}dk`;
                }
            } else {
                // Default stats for unsupported platforms
                document.getElementById('scrollCount').textContent = '0';
                document.getElementById('timeSaved').textContent = '0dk';
            }
        } catch (error) {
            // Default values if we can't get stats
            document.getElementById('scrollCount').textContent = '0';
            document.getElementById('timeSaved').textContent = '0dk';
        }
    }
    
    isSupportedPlatform(url) {
        if (!url) return false;
        
        const supportedPlatforms = [
            'instagram.com',
            'tiktok.com',
            'twitter.com',
            'x.com',
            'facebook.com',
            'youtube.com'
        ];
        
        return supportedPlatforms.some(platform => url.includes(platform));
    }
    
    openGitHub() {
        chrome.tabs.create({
            url: 'https://github.com/cumakaradash/sovereign-scroll'
        });
    }
    
    openCoffeeSupport() {
        chrome.tabs.create({
            url: 'https://www.buymeacoffee.com/cumakaradash'
        });
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SovereignScrollPopup();
});

// Update stats when popup is opened
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url) {
        const popup = new SovereignScrollPopup();
        popup.updateStats();
    }
});
