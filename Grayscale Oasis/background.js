class BackgroundManager {
    constructor() {
        this.defaultSettings = {
            grayscaleOasis: false,
            language: 'tr',
            darkTheme: false
        };
        this.init();
    }

    async init() {
        await this.initializeSettings();
        this.setupContextMenus();
        this.setupMessageListener();
    }

    async initializeSettings() {
        try {
            const result = await chrome.storage.sync.get(this.defaultSettings);
            const settings = { ...this.defaultSettings, ...result };
            await chrome.storage.sync.set(settings);
        } catch (error) {
            console.error('Error initializing settings:', error);
        }
    }

    setupContextMenus() {
        chrome.runtime.onInstalled.addListener(() => {
            chrome.contextMenus.create({
                id: 'grayscaleOasis',
                title: 'Toggle Grayscale',
                contexts: ['page']
            });
        });

        chrome.contextMenus.onClicked.addListener((info, tab) => {
            if (info.menuItemId === 'grayscaleOasis') {
                this.toggleGrayscaleOasis(tab.id);
            }
        });
    }

    async toggleGrayscaleOasis(tabId) {
        try {
            const result = await chrome.storage.sync.get('grayscaleOasis');
            const newValue = !result.grayscaleOasis;
            await chrome.storage.sync.set({ grayscaleOasis: newValue });
            
            chrome.tabs.sendMessage(tabId, {
                type: 'updateSettings',
                settings: { grayscaleOasis: newValue }
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log('Content script not available:', chrome.runtime.lastError.message);
                }
            });
        } catch (error) {
            console.error('Error toggling grayscale:', error);
        }
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'getSettings') {
                chrome.storage.sync.get(this.defaultSettings, sendResponse);
                return true;
            }
        });
    }
}

new BackgroundManager();
