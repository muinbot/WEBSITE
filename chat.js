// Chat Page JavaScript
class ChatPage {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.settings = this.loadSettings();
        this.chatHistory = this.loadChatHistory();
        this.initializeChat();
        this.bindEvents();
        this.applySettings();
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    loadSettings() {
        const defaultSettings = {
            primaryColor: '#4896d2',
            secondaryColor: '#212c5f',
            botColor: '#6c757d',
            backgroundColor: '#ffffff',
            textColor: '#333333',
            borderColor: '#e2e8f0',
            webhookUrl: 'https://n8n.srv1061552.hstgr.cloud/webhook/8c6e695b-507b-4ac6-80cd-website',
            title: 'الدعم الفني',
            titleEn: 'Customer Support',
            welcomeMessage: 'مرحباً! كيف يمكنني مساعدتك اليوم؟',
            welcomeMessageEn: 'Hello! How can I help you today?',
            language: 'ar'
        };

        const savedSettings = localStorage.getItem('chatWidget_settings');
        const merged = savedSettings ? { ...defaultSettings, ...JSON.parse(savedSettings) } : defaultSettings;
        
        // Ensure webhook is set
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

        // Apply language
        this.applyLanguage();

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
        const body = document.body;
        const messageInput = document.getElementById('message-input');
        
        if (this.settings.language === 'ar') {
            body.setAttribute('dir', 'rtl');
            body.setAttribute('lang', 'ar');
            if (messageInput) {
                messageInput.setAttribute('dir', 'rtl');
                messageInput.setAttribute('lang', 'ar');
                messageInput.placeholder = 'اكتب رسالتك هنا...';
            }
        } else {
            body.setAttribute('dir', 'ltr');
            body.setAttribute('lang', 'en');
            if (messageInput) {
                messageInput.setAttribute('dir', 'ltr');
                messageInput.setAttribute('lang', 'en');
                messageInput.placeholder = 'Type your message here...';
            }
        }
    }

    initializeChat() {
        // Load chat history
        this.displayChatHistory();
    }

    displayChatHistory() {
        const messagesContainer = document.getElementById('chat-messages');
        const welcomeMessage = document.getElementById('welcome-message');
        
        // Clear existing messages except welcome
        const existingMessages = messagesContainer.querySelectorAll('.message, .typing-indicator');
        existingMessages.forEach(msg => {
            if (msg !== welcomeMessage && !msg.closest('.welcome-message')) {
                msg.remove();
            }
        });

        // Hide welcome message if there's history
        if (this.chatHistory.length > 0 && welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }

        // Display chat history
        this.chatHistory.forEach(msg => {
            this.addMessageToUI(msg.message, msg.type, msg.timestamp);
        });
    }

    bindEvents() {
        const sendButton = document.getElementById('send-button');
        const messageInput = document.getElementById('message-input');
        const clearButton = document.getElementById('clear-chat');
        const languageSwitcher = document.getElementById('language-switcher');
        const quickActionBtns = document.querySelectorAll('.quick-action-btn');

        sendButton.addEventListener('click', () => this.sendMessage());
        
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        clearButton.addEventListener('click', () => this.clearChat());

        languageSwitcher.addEventListener('click', () => {
            this.toggleLanguage();
        });

        // Quick action buttons
        quickActionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.getAttribute('data-action');
                if (action) {
                    messageInput.value = action;
                    this.sendMessage();
                }
            });
        });

        // Auto-focus input
        setTimeout(() => {
            messageInput.focus();
        }, 300);
    }

    async sendMessage() {
        const messageInput = document.getElementById('message-input');
        const message = messageInput.value.trim();
        
        if (!message) return;

        // Hide welcome message
        const welcomeMessage = document.getElementById('welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }

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
                const errorMsg = this.settings.language === 'ar' 
                    ? 'عذراً، حدث خطأ في الاستجابة. يرجى المحاولة مرة أخرى.'
                    : 'Sorry, an error occurred. Please try again.';
                this.addMessageToUI(errorMsg, 'bot');
            }
        } catch (error) {
            this.hideTypingIndicator();
            console.error('Webhook error:', error);
            const errorMsg = this.settings.language === 'ar'
                ? 'عذراً، لا يمكن الاتصال بالخادم حالياً. يرجى المحاولة لاحقاً.'
                : 'Sorry, cannot connect to server. Please try again later.';
            this.addMessageToUI(errorMsg, 'bot');
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
                console.log('Non-JSON response body:', rawText);
                return rawText ? { message: rawText } : { message: '' };
            } catch (_) {
                rawText = '';
                console.log('Could not read response as text');
                return { message: '' };
            }
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
            <span class="message-time">${timeStr}</span>
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

    clearChat() {
        if (confirm(this.settings.language === 'ar' 
            ? 'هل أنت متأكد من مسح جميع الرسائل؟'
            : 'Are you sure you want to clear all messages?')) {
            this.chatHistory = [];
            this.saveChatHistory();
            this.displayChatHistory();
            
            // Show welcome message again
            const welcomeMessage = document.getElementById('welcome-message');
            if (welcomeMessage) {
                welcomeMessage.style.display = 'block';
            }
        }
    }

    toggleLanguage() {
        const newLang = this.settings.language === 'ar' ? 'en' : 'ar';
        this.settings.language = newLang;
        localStorage.setItem('chatWidget_settings', JSON.stringify(this.settings));
        this.applySettings();
        this.displayChatHistory();
    }

    updateLanguageSwitcher() {
        const langText = document.querySelector('.lang-text');
        if (langText) {
            langText.textContent = this.settings.language === 'ar' ? 'EN' : 'AR';
        }
    }
}

// Initialize chat when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chatPage = new ChatPage();
});

