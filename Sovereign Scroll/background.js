// Sovereign Scroll - Background Script
class SovereignScrollBackground {
    constructor() {
        this.defaultSettings = {
            scrollLimit: false,
            timeLimit: false,
            awarenessQuestion: false,
            strictMode: false,
            scrollLimitCount: 10,
            timeLimitMinutes: 5
        };
        
        this.defaultLang = 'tr';
        this.defaultTheme = 'dark';
        
        this.init();
    }
    
    init() {
        // Initialize default settings if they don't exist
        this.initializeSettings();
        
        // Setup message handlers
        this.setupMessageHandlers();
        
        // Setup context menu for quick access
        this.setupContextMenu();
    }
    
    async initializeSettings() {
        try {
            const result = await chrome.storage.sync.get(['sovereignScrollSettings', 'sovereignScrollLang', 'sovereignScrollTheme']);
            
            if (!result.sovereignScrollSettings) {
                await chrome.storage.sync.set({
                    sovereignScrollSettings: this.defaultSettings
                });
            }
            
            if (!result.sovereignScrollLang) {
                await chrome.storage.sync.set({
                    sovereignScrollLang: this.defaultLang
                });
            }
            
            if (!result.sovereignScrollTheme) {
                await chrome.storage.sync.set({
                    sovereignScrollTheme: this.defaultTheme
                });
            }
        } catch (error) {
            console.log('Sovereign Scroll: Failed to initialize settings');
        }
    }
    
    setupMessageHandlers() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'getSettings') {
                this.getSettings().then(settings => {
                    sendResponse(settings);
                });
                return true; // Keep the message channel open for async response
            }
            
            if (request.action === 'updateSettings') {
                this.updateSettings(request.settings).then(() => {
                    // Notify all tabs about the settings update
                    this.notifyAllTabs('updateSettings', request.settings);
                    sendResponse({ success: true });
                });
                return true;
            }
            
            if (request.action === 'updateLanguage') {
                this.updateLanguage(request.lang).then(() => {
                    // Notify all tabs about the language update
                    this.notifyAllTabs('updateLanguage', request.lang);
                    sendResponse({ success: true });
                });
                return true;
            }
            
            if (request.action === 'resetStats') {
                this.resetStats().then(() => {
                    // Notify all tabs about the stats reset
                    this.notifyAllTabs('resetStats', {});
                    sendResponse({ success: true });
                });
                return true;
            }
            
            if (request.action === 'updateTheme') {
                this.updateTheme(request.theme).then(() => {
                    // Notify all tabs about the theme update
                    this.notifyAllTabs('updateTheme', request.theme);
                    sendResponse({ success: true });
                });
                return true;
            }
        });
    }
    
    async getSettings() {
        try {
            const result = await chrome.storage.sync.get(['sovereignScrollSettings', 'sovereignScrollLang', 'sovereignScrollTheme']);
            return {
                settings: result.sovereignScrollSettings || this.defaultSettings,
                lang: result.sovereignScrollLang || this.defaultLang,
                theme: result.sovereignScrollTheme || this.defaultTheme
            };
        } catch (error) {
            console.log('Sovereign Scroll: Failed to get settings');
            return {
                settings: this.defaultSettings,
                lang: this.defaultLang,
                theme: this.defaultTheme
            };
        }
    }
    
    async updateSettings(newSettings) {
        try {
            const result = await chrome.storage.sync.get(['sovereignScrollSettings']);
            const currentSettings = result.sovereignScrollSettings || this.defaultSettings;
            const updatedSettings = { ...currentSettings, ...newSettings };
            
            await chrome.storage.sync.set({
                sovereignScrollSettings: updatedSettings
            });
        } catch (error) {
            console.log('Sovereign Scroll: Failed to update settings');
        }
    }
    
    async updateLanguage(lang) {
        try {
            await chrome.storage.sync.set({
                sovereignScrollLang: lang
            });
        } catch (error) {
            console.log('Sovereign Scroll: Failed to update language');
        }
    }
    
    async updateTheme(theme) {
        try {
            await chrome.storage.sync.set({
                sovereignScrollTheme: theme
            });
        } catch (error) {
            console.log('Sovereign Scroll: Failed to update theme');
        }
    }
    
    async resetStats() {
        try {
            await chrome.storage.sync.set({
                sovereignScrollState: {
                    scrollCount: 0,
                    date: new Date().toISOString()
                }
            });
        } catch (error) {
            console.log('Sovereign Scroll: Failed to reset stats');
        }
    }
    
    async notifyAllTabs(action, data) {
        try {
            const tabs = await chrome.tabs.query({});
            
            tabs.forEach(tab => {
                if (tab.url && this.isSupportedPlatform(tab.url)) {
                    chrome.tabs.sendMessage(tab.id, {
                        action: action,
                        ...data
                    }).catch(error => {
                        // Ignore errors for tabs that don't have the content script loaded
                    });
                }
            });
        } catch (error) {
            console.log('Sovereign Scroll: Failed to notify tabs');
        }
    }
    
    isSupportedPlatform(url) {
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
    
    setupContextMenu() {
        chrome.runtime.onInstalled.addListener(() => {
            if (chrome.contextMenus) {
                chrome.contextMenus.create({
                    id: 'sovereign-scroll-toggle',
                    title: 'Sovereign Scroll: Toggle Blocking',
                    contexts: ['page'],
                    documentUrlPatterns: [
                        '*://*.instagram.com/*',
                        '*://*.tiktok.com/*',
                        '*://*.twitter.com/*',
                        '*://*.x.com/*',
                        '*://*.facebook.com/*',
                        '*://*.youtube.com/*'
                    ]
                });
            }
        });
        
        if (chrome.contextMenus) {
            chrome.contextMenus.onClicked.addListener((info, tab) => {
                if (info.menuItemId === 'sovereign-scroll-toggle') {
                    // Send message to content script to toggle blocking
                    chrome.tabs.sendMessage(tab.id, {
                        action: 'toggleBlocking'
                    }).catch(error => {
                        console.log('Sovereign Scroll: Failed to toggle blocking');
                    });
                }
            });
        }
    }
}

// Initialize the background script
new SovereignScrollBackground();
