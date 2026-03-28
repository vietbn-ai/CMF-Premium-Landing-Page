document.addEventListener("DOMContentLoaded", () => {
    // UI Elements
    const chatContainer = document.getElementById("chatbot-container");
    const chatLauncher = document.getElementById("chat-launcher");
    const closeBtn = document.getElementById("chat-close-btn");
    const refreshBtn = document.getElementById("chat-refresh-btn");
    const refreshIcon = document.getElementById("refresh-icon");
    const chatMessages = document.getElementById("chat-messages");
    const chatInput = document.getElementById("chat-input");
    const sendBtn = document.getElementById("chat-send-btn");

    let systemPrompt = "";
    let messageHistory = [];

    // OpenRouter API Configuration
    const API_URL = "https://openrouter.ai/api/v1/chat/completions";
    const API_KEY = "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";
    const MODEL_NAME = "z-ai/glm-4.5-air:free";

    // Initialize Chatbot Data
    async function initChatbot() {
        try {
            const response = await fetch("./chatbot_data.txt");
            let knowledgeBase = "";
            if (response.ok) {
                knowledgeBase = await response.text();
            } else {
                console.error("Không tải được cơ sở dữ liệu cho chatbot!");
            }

            systemPrompt = `
Bạn là AI trợ lý cá nhân độc quyền trên website của chuyên gia Nguyễn Văn A. 
Nhiệm vụ của bạn là hỗ trợ khách truy cập lịch sự, cung cấp thông tin chính xác về các dịch vụ, khóa học, và dự án của chuyên gia này.

Dưới đây là cơ sở dữ liệu kiến thức (Knowledge Base) của bạn:
${knowledgeBase}

Quy tắc giao tiếp bắt buộc:
1. Luôn chào hỏi thân thiện và kết thúc bằng cách mời họ đặt thêm câu hỏi.
2. Bạn phải định dạng các câu trả lời của mình bằng Markdown đầy đủ (in đậm ý chính, dùng gạch đầu dòng, tạo code block nếu cần).
3. Nếu người dùng hỏi điều gì ngoài phạm vi dữ liệu trên, hãy tế nhị từ chối và hướng dẫn họ gửi email hoặc nhắn tin Zalo trực tiếp cho chuyên gia.
4. Không được phép bịa đặt thông tin ngoài cơ sở dữ liệu đã cấp.
            `.trim();

            resetChat();
        } catch (error) {
            console.error("Lỗi khởi tạo chatbot:", error);
        }
    }

    function resetChat() {
        chatMessages.innerHTML = '';
        messageHistory = [
            { role: "system", content: systemPrompt }
        ];
        appendBotMessage("Xin chào! 👋 Tôi là trợ lý AI ảo của chuyên gia Nguyễn Văn A. Tôi có thể giúp gì cho bạn hôm nay?");
    }

    // Toggle Chat Window
    chatLauncher.addEventListener("click", () => {
        chatContainer.classList.add("open");
        chatLauncher.style.display = "none";
        setTimeout(() => chatInput.focus(), 100);
    });

    closeBtn.addEventListener("click", () => {
        chatContainer.classList.remove("open");
        chatLauncher.style.display = "flex";
    });

    // Refresh Logic (BẮT BUỘC)
    refreshBtn.addEventListener("click", () => {
        // 1. Icon refresh có animation xoay
        refreshIcon.classList.add("spinning");
        
        // 2. Xóa toàn bộ lịch sử chat
        resetChat();

        // 4. Dừng animation xoay sau đúng 500ms
        setTimeout(() => {
            refreshIcon.classList.remove("spinning");
        }, 500);
    });

    // Helper: Scroll to bottom
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // UI: Append User Message
    function appendUserMessage(text) {
        const msgDiv = document.createElement("div");
        msgDiv.className = "message user";
        msgDiv.textContent = text;
        chatMessages.appendChild(msgDiv);
        scrollToBottom();
    }

    // UI: Append Bot Message
    function appendBotMessage(text) {
        const msgDiv = document.createElement("div");
        msgDiv.className = "message bot chat-markdown";
        // Render Markdown
        msgDiv.innerHTML = marked.parse(text);
        chatMessages.appendChild(msgDiv);
        scrollToBottom();
    }

    // UI: Typing Indicator
    let typingIndicatorElement = null;
    function showTypingIndicator() {
        if (typingIndicatorElement) return;
        typingIndicatorElement = document.createElement("div");
        typingIndicatorElement.className = "typing-indicator";
        typingIndicatorElement.innerHTML = `
            <span>Đang nhập</span>
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        chatMessages.appendChild(typingIndicatorElement);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        if (typingIndicatorElement) {
            typingIndicatorElement.remove();
            typingIndicatorElement = null;
        }
    }

    // Handle Sending Message
    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        // Clear input and show user message
        chatInput.value = "";
        appendUserMessage(text);
        messageHistory.push({ role: "user", content: text });

        // Show typing indicator
        showTypingIndicator();

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${API_KEY}`,
                    "HTTP-Referer": "https://vietbn-ai.github.io/CMF-Premium-Landing-Page/",
                    "X-Title": "CMF Virtual Assistant"
                },
                body: JSON.stringify({
                    model: MODEL_NAME,
                    messages: messageHistory
                })
            });

            const data = await response.json();
            
            removeTypingIndicator(); // Bắt buộc xoá trạng thái Typing

            if (data.choices && data.choices.length > 0) {
                const botReply = data.choices[0].message.content;
                messageHistory.push({ role: "assistant", content: botReply });
                appendBotMessage(botReply);
            } else {
                appendBotMessage("Xin lỗi, tôi không thể xử lý yêu cầu lúc này. Vui lòng thử lại sau.");
            }
        } catch (error) {
            console.error("Lỗi gọi API OpenRouter:", error);
            removeTypingIndicator();
            appendBotMessage("Đã xảy ra lỗi kết nối. Vui lòng kiểm tra mạng hoặc thử lại.");
        }
    }

    // Events for input
    sendBtn.addEventListener("click", sendMessage);
    chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            sendMessage();
        }
    });

    // Run Initialization
    initChatbot();
});
