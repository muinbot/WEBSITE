// Chat Widget JavaScript
class ChatWidget {
    constructor() {
        this.isOpen = false;
        this.sessionId = this.generateSessionId();
        this.settings = this.loadSettings();
        this.chatHistory = this.loadChatHistory();
        this.initializeWidget();
        this.bindEvents();
        this.applySettings();
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    loadSettings() {
        const defaultSettings = {
            primaryColor: '#007bff',
            secondaryColor: '#28a745',
            botColor: '#6c757d',
            backgroundColor: '#ffffff',
            textColor: '#333333',
            borderColor: '#dee2e6',
            shadowColor: 'rgba(0, 0, 0, 0.1)',
            position: 'bottom-right',
            welcomeMessage: 'مرحباً! كيف يمكنني مساعدتك اليوم؟',
            welcomeMessageEn: 'Hello! How can I help you today?',
            webhookUrl: 'https://n8n.srv1061552.hstgr.cloud/webhook/8c6e695b-507b-4ac6-80cd-website',
            title: 'الدعم الفني',
            titleEn: 'Customer Support',
            language: 'ar'
        };

        const savedSettings = localStorage.getItem('chatWidget_settings');
        const merged = savedSettings ? { ...defaultSettings, ...JSON.parse(savedSettings) } : defaultSettings;
        // Ensure webhook is set even if older saved settings had empty string
        if (!merged.webhookUrl || typeof merged.webhookUrl !== 'string' || merged.webhookUrl.trim() === '') {
            merged.webhookUrl = defaultSettings.webhookUrl;
        }
        return merged;
    }

    loadChatHistory() {
        const history = localStorage.getItem('chatWidget_history');
        return history ? JSON.parse(history) : [];
    }

    saveChatHistory() {
        localStorage.setItem('chatWidget_history', JSON.stringify(this.chatHistory));
    }

    applySettings() {
        const root = document.documentElement;
        root.style.setProperty('--primary-color', this.settings.primaryColor);
        root.style.setProperty('--secondary-color', this.settings.secondaryColor);
        root.style.setProperty('--bot-color', this.settings.botColor);
        root.style.setProperty('--background-color', this.settings.backgroundColor);
        root.style.setProperty('--text-color', this.settings.textColor);
        root.style.setProperty('--border-color', this.settings.borderColor);
        root.style.setProperty('--shadow-color', this.settings.shadowColor);

        // Apply position
        const widget = document.getElementById('chat-widget');
        widget.className = `chat-widget ${this.settings.position}`;

        // Apply language
        this.applyLanguage();

        // Apply welcome message
        const welcomeMessage = document.getElementById('welcome-message');
        if (welcomeMessage) {
            const message = this.settings.language === 'ar' ? this.settings.welcomeMessage : this.settings.welcomeMessageEn;
            welcomeMessage.innerHTML = `<p>${message}</p>`;
        }

        // Apply title
        const title = document.getElementById('chat-title');
        if (title) {
            const titleText = this.settings.language === 'ar' ? this.settings.title : this.settings.titleEn;
            title.textContent = titleText;
        }

        // Update language switcher
        this.updateLanguageSwitcher();
    }

    applyLanguage() {
        const widget = document.getElementById('chat-widget');
        const chatWindow = document.getElementById('chat-window');
        const messageInput = document.getElementById('message-input');
        
        console.log('Applying language:', this.settings.language);
        
        if (this.settings.language === 'ar') {
            widget.setAttribute('dir', 'rtl');
            widget.setAttribute('lang', 'ar');
            if (messageInput) {
                messageInput.setAttribute('dir', 'rtl');
                messageInput.setAttribute('lang', 'ar');
                messageInput.placeholder = 'اكتب رسالتك هنا...';
            }
            console.log('Applied Arabic (RTL)');
        } else {
            widget.setAttribute('dir', 'ltr');
            widget.setAttribute('lang', 'en');
            if (messageInput) {
                messageInput.setAttribute('dir', 'ltr');
                messageInput.setAttribute('lang', 'en');
                messageInput.placeholder = 'Type your message here...';
            }
            console.log('Applied English (LTR)');
        }
    }

    initializeWidget() {
        // Load chat history
        this.displayChatHistory();
    }

    displayChatHistory() {
        const messagesContainer = document.getElementById('chat-messages');
        const welcomeMessage = document.getElementById('welcome-message');
        
        // Clear existing messages except welcome
        const existingMessages = messagesContainer.querySelectorAll('.message, .typing-indicator');
        existingMessages.forEach(msg => msg.remove());

        // Display chat history
        this.chatHistory.forEach(msg => {
            this.addMessageToUI(msg.message, msg.type, msg.timestamp);
        });
    }

    bindEvents() {
        const chatButton = document.getElementById('chat-button');
        const closeButton = document.getElementById('close-chat');
        const sendButton = document.getElementById('send-button');
        const messageInput = document.getElementById('message-input');

        chatButton.addEventListener('click', () => this.toggleChat());
        closeButton.addEventListener('click', () => this.closeChat());
        sendButton.addEventListener('click', () => this.sendMessage());
        
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Auto-focus input when chat opens
        chatButton.addEventListener('click', () => {
            setTimeout(() => {
                messageInput.focus();
            }, 300);
        });

        // Language switcher
        const languageSwitcher = document.getElementById('language-switcher');
        console.log('Language switcher element:', languageSwitcher);
        if (languageSwitcher) {
            languageSwitcher.addEventListener('click', () => {
                console.log('Language switcher clicked!');
                this.toggleLanguage();
            });
            console.log('Language switcher event listener added');
        } else {
            console.log('Language switcher not found!');
        }

        // Handle window resize/orientation change for mobile
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const chatWindow = document.getElementById('chat-window');
                const chatWidget = document.getElementById('chat-widget');
                const isMobile = window.innerWidth <= 768;
                
                // Re-check if we need to add/remove chat-open class
                if (this.isOpen) {
                    if (isMobile) {
                        document.body.classList.add('chat-open');
                        // Ensure window is in body on mobile
                        if (chatWindow.parentElement !== document.body) {
                            document.body.appendChild(chatWindow);
                        }
                    } else {
                        document.body.classList.remove('chat-open');
                        // Move window back to widget on desktop
                        if (chatWindow.parentElement === document.body && chatWidget) {
                            chatWidget.appendChild(chatWindow);
                        }
                    }
                }
            }, 100);
        });
    }

    toggleChat() {
        this.isOpen = !this.isOpen;
        const chatWindow = document.getElementById('chat-window');
        const chatWidget = document.getElementById('chat-widget');
        const isMobile = window.innerWidth <= 768;
        
        if (this.isOpen) {
            // On mobile, move chat-window to body for proper fullscreen positioning
            if (isMobile && chatWindow.parentElement !== document.body) {
                document.body.appendChild(chatWindow);
            }
            chatWindow.classList.add('show');
            // Prevent body scroll on mobile when chat is open
            if (isMobile) {
                document.body.classList.add('chat-open');
            }
        } else {
            chatWindow.classList.remove('show');
            // Re-enable body scroll when chat is closed
            document.body.classList.remove('chat-open');
            // Move chat-window back to widget on close (for desktop)
            if (!isMobile && chatWindow.parentElement === document.body && chatWidget) {
                chatWidget.appendChild(chatWindow);
            }
        }
    }

    closeChat() {
        this.isOpen = false;
        const chatWindow = document.getElementById('chat-window');
        const chatWidget = document.getElementById('chat-widget');
        const isMobile = window.innerWidth <= 768;
        
        chatWindow.classList.remove('show');
        // Re-enable body scroll when chat is closed
        document.body.classList.remove('chat-open');
        // Move chat-window back to widget on close (for desktop)
        if (!isMobile && chatWindow.parentElement === document.body && chatWidget) {
            chatWidget.appendChild(chatWindow);
        }
    }

    async sendMessage() {
        const messageInput = document.getElementById('message-input');
        const message = messageInput.value.trim();
        
        if (!message) return;

        // Clear input
        messageInput.value = '';

        // Add user message to chat
        this.addMessageToUI(message, 'user');
        
        // Save to history
        this.chatHistory.push({
            message: message,
            type: 'user',
            timestamp: new Date().toISOString()
        });
        this.saveChatHistory();

        // Show typing indicator
        this.showTypingIndicator();

        // Send to webhook
        try {
            console.log('Sending message to webhook:', message);
            const response = await this.sendToWebhook(message);
            this.hideTypingIndicator();
            
            console.log('Webhook response received:', response);
            console.log('Response type:', typeof response);
            console.log('Response keys:', response ? Object.keys(response) : 'null');
            
            // Extract bot message from common shapes or plain string
            let botMessage = null;
            let responseData = response;
            
            // If response is an array, get the first element
            if (Array.isArray(responseData) && responseData.length > 0) {
                responseData = responseData[0];
            }
            
            // If response is a string, use it directly
            if (typeof responseData === 'string') {
                botMessage = responseData.trim();
            } 
            // If response is an object, try multiple possible fields
            else if (responseData && typeof responseData === 'object') {
                // Try common response formats (output first since that's what we're getting)
                botMessage = responseData.output || 
                           responseData.message || 
                           responseData.reply || 
                           responseData.text || 
                           responseData.content || 
                           responseData.data ||
                           responseData.response ||
                           responseData.answer ||
                           responseData.result ||
                           null;
                
                // If still null, try to stringify the whole response (for debugging)
                if (!botMessage && responseData) {
                    // Check if response has a single string value
                    const values = Object.values(responseData);
                    if (values.length === 1 && typeof values[0] === 'string') {
                        botMessage = values[0].trim();
                    } else {
                        // Last resort: stringify the response
                        console.warn('Could not find message field, response structure:', responseData);
                        botMessage = JSON.stringify(responseData);
                    }
                }
            }
            
            // Clean up the message - remove any JSON artifacts or extra quotes
            if (botMessage) {
                // Remove surrounding quotes if present
                botMessage = botMessage.replace(/^["']|["']$/g, '');
                // Trim whitespace
                botMessage = botMessage.trim();
            }
            
            if (botMessage && botMessage.length > 0) {
                console.log('Bot message extracted:', botMessage);
                this.addMessageToUI(botMessage, 'bot');
                this.chatHistory.push({
                    message: botMessage,
                    type: 'bot',
                    timestamp: new Date().toISOString()
                });
                this.saveChatHistory();
            } else {
                console.error('Invalid response format - could not extract message:', response);
                console.error('Response stringified:', JSON.stringify(response));
                this.addMessageToUI('عذراً، حدث خطأ في الاستجابة. يرجى المحاولة مرة أخرى.', 'bot');
            }
        } catch (error) {
            this.hideTypingIndicator();
            console.error('Webhook error:', error);
            this.addMessageToUI('عذراً، لا يمكن الاتصال بالخادم حالياً. يرجى المحاولة لاحقاً.', 'bot');
        }
    }

    async sendToWebhook(message) {
        if (!this.settings.webhookUrl) {
            throw new Error('No webhook URL configured');
        }

        const payload = {
            userInput: message,
            contactId: this.sessionId,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            type: 'user_message'
        };

        console.log('Sending payload to webhook:', payload);
        console.log('Webhook URL:', this.settings.webhookUrl);

        const response = await fetch(this.settings.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/plain;q=0.9, */*;q=0.8'
            },
            body: JSON.stringify(payload),
            mode: 'cors'
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            console.error('HTTP error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        // Try JSON first; if it fails, fallback to plain text
        let rawText = '';
        try {
            const cloned = response.clone();
            const json = await response.json();
            console.log('Parsed JSON response data:', json);
            return json;
        } catch (e) {
            try {
                rawText = await response.text();
            } catch (_) {
                rawText = '';
            }
            console.log('Non-JSON response body:', rawText);
            return rawText ? { message: rawText } : { message: '' };
        }
    }

    addMessageToUI(message, type, timestamp = null) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString('ar-SA', { 
            hour: '2-digit', 
            minute: '2-digit' 
        }) : new Date().toLocaleTimeString('ar-SA', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageDiv.innerHTML = `
            <div>${this.escapeHtml(message)}</div>
            <div style="font-size: 11px; opacity: 0.7; margin-top: 5px;">${timeStr}</div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    showTypingIndicator() {
        const messagesContainer = document.getElementById('chat-messages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        
        messagesContainer.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    scrollToBottom() {
        const messagesContainer = document.getElementById('chat-messages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Public method to update settings (called from admin panel)
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        localStorage.setItem('chatWidget_settings', JSON.stringify(this.settings));
        this.applySettings();
    }

    // Public method to clear chat history
    clearHistory() {
        this.chatHistory = [];
        this.saveChatHistory();
        this.displayChatHistory();
    }

    // Public method to change language
    changeLanguage(lang) {
        this.settings.language = lang;
        localStorage.setItem('chatWidget_settings', JSON.stringify(this.settings));
        this.applySettings();
        this.displayChatHistory();
    }

    // Public method to get current language
    getCurrentLanguage() {
        return this.settings.language;
    }

    // Toggle between languages
    toggleLanguage() {
        const newLang = this.settings.language === 'ar' ? 'en' : 'ar';
        console.log('Toggling language from', this.settings.language, 'to', newLang);
        this.changeLanguage(newLang);
        this.updateLanguageSwitcher();
    }

    // Update language switcher display
    updateLanguageSwitcher() {
        const switcher = document.getElementById('language-switcher');
        const langText = document.querySelector('.lang-text');
        console.log('Updating language switcher:', this.settings.language);
        if (switcher && langText) {
            langText.textContent = this.settings.language === 'ar' ? 'EN' : 'AR';
            console.log('Language switcher updated to:', langText.textContent);
        } else {
            console.log('Language switcher elements not found:', { switcher, langText });
        }
    }
}

// Initialize widget when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chatWidget = new ChatWidget();
});

// Export for external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatWidget;
}
