import App from './src/App.js';
import { getSatelliteChatResponse, resetConversation } from './groq_api.js';

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', async () => {

    await new Promise(resolve => setTimeout(resolve, 100));

    let app;
    try {
        app = new App();
    } catch (error) {
        console.error('Error initializing app:', error);
    }

    resetConversation();

    // Hide chat panel initially
    const chatPanel = document.getElementById('chat-panel');
    if (chatPanel) chatPanel.style.display = 'none';

    // Add chat functionality
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-message');
    const chatMessages = document.getElementById('chat-messages');

    if (!chatInput || !sendButton || !chatMessages) {
        console.error('Chat elements not found');
        return;
    }

    async function handleSatelliteChat() {
        const message = chatInput.value.trim();
        if (!message) return;
    
        // Add user message to chat
        const userMessageDiv = document.createElement('div');
        userMessageDiv.className = 'message user-message';
        userMessageDiv.textContent = message;
        chatMessages.appendChild(userMessageDiv);
    
        // Clear input
        chatInput.value = '';
    
        // Create assistant message container
        const assistantMessageDiv = document.createElement('div');
        assistantMessageDiv.className = 'message assistant-message';
        chatMessages.appendChild(assistantMessageDiv);
    
        try {
            // Get satellite data from the globe's satellitesGroup
            const satelliteData = [];
            if (app?.globe?.satellitesGroup) {
                app.globe.satellitesGroup.children.forEach(satelliteMesh => {
                    if (satelliteMesh.userData) {
                        satelliteData.push(satelliteMesh.userData);
                    }
                });
            }
            
            console.log('Sending satellite data to chat');

            let accumulatedText = '';
            const stream = await getSatelliteChatResponse(message, satelliteData);
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || "";
                accumulatedText += content;
                // Render the accumulated markdown
                assistantMessageDiv.innerHTML = marked.parse(accumulatedText);
                // Syntax highlighting for code blocks (optional)
                assistantMessageDiv.querySelectorAll('pre code').forEach((block) => {
                    hljs.highlightElement(block);
                });
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        } catch (error) {
            console.error('Chat error:', error);
            assistantMessageDiv.textContent = 'Sorry, there was an error processing your request.';
        }
    }

    sendButton.addEventListener('click', handleSatelliteChat);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSatelliteChat();
        }
    });
    
    // Handle navigation
    const handleNavigation = (path) => {
        const globeContainer = document.getElementById('globe-container');
        const learnContent = document.getElementById('learn-content');
        const aboutContent = document.getElementById('about-content');
        const navLinks = document.querySelectorAll('nav a');
        const satelliteInfo = document.getElementById('satelliteInfo');

        // Remove active class from all links
        navLinks.forEach(link => link.classList.remove('active'));
        
        // Hide all content first
        globeContainer.style.display = 'none';
        learnContent.style.display = 'none';
        aboutContent.style.display = 'none';
        if (satelliteInfo) {
            satelliteInfo.style.display = 'none'; // Ensure info container is hidden on navigation
        }
        
        // Show appropriate content based on path
        switch(path) {
            case '/learn':
                learnContent.style.display = 'block';
                document.querySelector('[data-page="learn"]').classList.add('active');
                break;
            case '/about':
                aboutContent.style.display = 'block';
                document.querySelector('[data-page="about"]').classList.add('active');
                break;
            case '/':
            case '':
                globeContainer.style.display = 'block';
                document.querySelector('[data-page="home"]').classList.add('active');
                break;

            default:
                globeContainer.style.display = 'block';
                document.querySelector('[data-page="home"]').classList.add('active');
                break;
        }
    };
    
    // Handle initial page load
    handleNavigation(window.location.pathname);

    // Add click event listeners to navigation links
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const path = link.getAttribute('href');
            window.history.pushState({}, '', path);
            handleNavigation(path);
        });
    });

    // Handle browser back/forward buttons
    window.addEventListener('popstate', () => {
        handleNavigation(window.location.pathname);
    });
});