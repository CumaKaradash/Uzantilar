// Sovereign Scroll - Content Script
class SovereignScroll {
    constructor() {
        this.settings = {
            scrollLimit: false,
            timeLimit: false,
            awarenessQuestion: false,
            strictMode: false,
            scrollLimitCount: 10,
            timeLimitMinutes: 5
        };
        
        this.state = {
            scrollCount: 0,
            startTime: Date.now(),
            lastScrollTime: Date.now(),
            isBlocked: false,
            sessionStartTime: Date.now()
        };
        
        this.messages = {
            tr: {
                continue: 'Devam Et',
                focus: 'Odağa Dön',
                pauseMessage: 'Otomatik akıştan çık, kontrol sende',
                scrollLimitReached: (count) => `${count} içerik tükettin. Derin bir nefes alıp odağa dönmek ister misin?`,
                timeLimitReached: 'Zaman sınırına ulaştın. Mola vermeye ne dersin?',
                awarenessQuestion: 'Kaydırmaya devam etmek istiyor musun?'
            },
            en: {
                continue: 'Continue',
                focus: 'Return Focus',
                pauseMessage: 'Break the automatic flow, control is yours',
                scrollLimitReached: (count) => `You've consumed ${count} content. Would you like to take a deep breath and return to focus?`,
                timeLimitReached: 'You\'ve reached the time limit. How about taking a break?',
                awarenessQuestion: 'Do you want to continue scrolling?'
            }
        };
        
        this.currentLang = 'tr';
        this.platform = this.detectPlatform();
        
        this.init();
    }
    
    detectPlatform() {
        const hostname = window.location.hostname.toLowerCase();
        if (hostname.includes('instagram.com')) return 'instagram';
        if (hostname.includes('tiktok.com')) return 'tiktok';
        if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter';
        if (hostname.includes('facebook.com')) return 'facebook';
        if (hostname.includes('youtube.com')) return 'youtube';
        return 'unknown';
    }
    
    async init() {
        await this.loadSettings();
        await this.loadState();
        this.setupScrollListener();
        this.setupTimeLimit();
        this.setupMessageListener();
    }
    
    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['sovereignScrollSettings', 'sovereignScrollLang']);
            if (result.sovereignScrollSettings) {
                this.settings = { ...this.settings, ...result.sovereignScrollSettings };
            }
            if (result.sovereignScrollLang) {
                this.currentLang = result.sovereignScrollLang;
            }
        } catch (error) {
            console.log('Sovereign Scroll: Failed to load settings');
        }
    }
    
    async loadState() {
        try {
            const result = await chrome.storage.sync.get(['sovereignScrollState']);
            if (result.sovereignScrollState) {
                const today = new Date().toDateString();
                const savedDate = new Date(result.sovereignScrollState.date).toDateString();
                
                if (today === savedDate) {
                    this.state.scrollCount = result.sovereignScrollState.scrollCount || 0;
                } else {
                    // Reset for new day
                    this.state.scrollCount = 0;
                    this.saveState();
                }
            }
        } catch (error) {
            console.log('Sovereign Scroll: Failed to load state');
        }
    }
    
    async saveState() {
        try {
            await chrome.storage.sync.set({
                sovereignScrollState: {
                    scrollCount: this.state.scrollCount,
                    date: new Date().toISOString()
                }
            });
        } catch (error) {
            console.log('Sovereign Scroll: Failed to save state');
        }
    }
    
    setupScrollListener() {
        let scrollTimeout;
        let lastScrollTop = 0;
        
        const handleScroll = () => {
            if (this.state.isBlocked) return;
            
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            // Detect meaningful scroll (not just small movements)
            if (Math.abs(scrollTop - lastScrollTop) > 50) {
                this.state.scrollCount++;
                this.state.lastScrollTime = Date.now();
                this.saveState();
                
                // Check scroll limit
                if (this.settings.scrollLimit && this.state.scrollCount % this.settings.scrollLimitCount === 0) {
                    this.blockScroll('scrollLimit');
                }
                
                // Check awareness question
                if (this.settings.awarenessQuestion && this.state.scrollCount % 20 === 0) {
                    this.showAwarenessQuestion();
                }
                
                lastScrollTop = scrollTop;
            }
            
            // Clear existing timeout
            clearTimeout(scrollTimeout);
            
            // Set new timeout to detect when scrolling stops
            scrollTimeout = setTimeout(() => {
                this.checkStrictMode();
            }, 1000);
        };
        
        window.addEventListener('scroll', handleScroll, { passive: true });
    }
    
    setupTimeLimit() {
        if (!this.settings.timeLimit) return;
        
        setInterval(() => {
            if (this.state.isBlocked) return;
            
            const elapsedMinutes = (Date.now() - this.state.sessionStartTime) / (1000 * 60);
            
            if (elapsedMinutes >= this.settings.timeLimitMinutes) {
                this.blockScroll('timeLimit');
                this.state.sessionStartTime = Date.now(); // Reset session time
            }
        }, 30000); // Check every 30 seconds
    }
    
    checkStrictMode() {
        if (!this.settings.strictMode || this.state.isBlocked) return;
        
        const timeSinceLastScroll = Date.now() - this.state.lastScrollTime;
        
        // If user has been scrolling continuously for more than 5 minutes
        if (timeSinceLastScroll < 2000 && (Date.now() - this.state.startTime) > 300000) {
            this.blockScroll('strictMode');
        }
    }
    
    blockScroll(reason) {
        this.state.isBlocked = true;
        
        // Add CSS to prevent scrolling
        const style = document.createElement('style');
        style.id = 'sovereign-scroll-block';
        style.textContent = `
            body {
                overflow: hidden !important;
                position: fixed !important;
                width: 100% !important;
                height: 100vh !important;
            }
            
            .sovereign-scroll-overlay {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100vh !important;
                background: rgba(15, 17, 21, 0.95) !important;
                z-index: 999999 !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: center !important;
                align-items: center !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                color: white !important;
            }
            
            .sovereign-scroll-message {
                font-size: 18px !important;
                margin-bottom: 20px !important;
                text-align: center !important;
                max-width: 400px !important;
                line-height: 1.5 !important;
            }
            
            .sovereign-scroll-button {
                background: #1a1d23 !important;
                border: 1px solid #2a2d35 !important;
                color: white !important;
                padding: 12px 24px !important;
                border-radius: 8px !important;
                cursor: pointer !important;
                font-size: 14px !important;
                transition: all 0.2s ease !important;
                min-width: 120px !important;
            }
            
            .sovereign-scroll-button:hover {
                background: #25282e !important;
                border-color: #3a3d45 !important;
            }
        `;
        document.head.appendChild(style);
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'sovereign-scroll-overlay';
        
        let message;
        switch (reason) {
            case 'scrollLimit':
                message = this.messages[this.currentLang].scrollLimitReached(this.state.scrollCount);
                break;
            case 'timeLimit':
                message = this.messages[this.currentLang].timeLimitReached;
                break;
            case 'strictMode':
                message = this.messages[this.currentLang].pauseMessage;
                break;
            default:
                message = this.messages[this.currentLang].pauseMessage;
        }
        
        overlay.innerHTML = `
            <div class="sovereign-scroll-message">${message}</div>
            <button class="sovereign-scroll-button" onclick="window.sovereignScroll.unblockScroll()">
                ${this.messages[this.currentLang].continue}
            </button>
        `;
        
        document.body.appendChild(overlay);
        
        // Make instance globally accessible for the onclick handler
        window.sovereignScroll = this;
    }
    
    unblockScroll() {
        this.state.isBlocked = false;
        
        // Remove blocking styles
        const style = document.getElementById('sovereign-scroll-block');
        if (style) style.remove();
        
        // Remove overlay
        const overlay = document.querySelector('.sovereign-scroll-overlay');
        if (overlay) overlay.remove();
        
        // Reset session start time
        this.state.sessionStartTime = Date.now();
    }
    
    showAwarenessQuestion() {
        // This would show a less intrusive modal or notification
        // For now, we'll keep it simple
        console.log('Sovereign Scroll: ' + this.messages[this.currentLang].awarenessQuestion);
    }
    
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'updateSettings') {
                this.settings = { ...this.settings, ...request.settings };
                this.setupTimeLimit(); // Re-setup time limit with new settings
            } else if (request.action === 'updateLanguage') {
                this.currentLang = request.lang;
            } else if (request.action === 'getState') {
                sendResponse({
                    scrollCount: this.state.scrollCount,
                    timeSaved: this.calculateTimeSaved()
                });
            }
        });
    }
    
    calculateTimeSaved() {
        // Simple calculation: assume 30 seconds saved per blocked scroll session
        const blockedSessions = Math.floor(this.state.scrollCount / this.settings.scrollLimitCount);
        return Math.round(blockedSessions * 0.5); // Return in minutes
    }
}

// Initialize the extension
if (typeof chrome !== 'undefined' && chrome.storage) {
    new SovereignScroll();
}
