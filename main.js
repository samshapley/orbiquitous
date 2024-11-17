import App from './src/App.js';
import { getSatelliteChatResponse, resetConversation } from './groq_api.js';
import MarsVisualization from './src/components/Mars.js';

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', async () => {

    await new Promise(resolve => setTimeout(resolve, 100));

    let app;
    let marsViz
    try {
        app = new App();
    } catch (error) {
        console.error('Error initializing app:', error);
    }

    resetConversation();

    // Add chat toggle functionality
    const toggleChatButton = document.getElementById('toggleChat');
    const chatPanel = document.getElementById('chat-panel');

    // Initialize chat panel as hidden
    if (chatPanel) {
        chatPanel.style.display = 'none';
        toggleChatButton.textContent = 'Talk to Orbit';  // Set initial button text
    }

    // Update chat toggle functionality
    if (toggleChatButton && chatPanel) {
        toggleChatButton.addEventListener('click', () => {
            const isHidden = chatPanel.style.display === 'none';
            chatPanel.style.display = isHidden ? 'flex' : 'none';  // Changed to 'flex' to maintain chat panel layout
            toggleChatButton.textContent = isHidden ? 'Hide Chat' : 'Talk to Orbit';
        });
    }


    const marsMode = document.getElementById('mars-mode');
    if (marsMode) {
        marsMode.addEventListener('click', () => {
            // Hide Earth
            const earthContainer = document.getElementById('earth-container');
            if (earthContainer) {
                earthContainer.style.display = 'none';
                // Optionally pause Earth animations/controls
                if (app?.globe?.controls) {
                    app.globe.controls.autoRotate = false;
                }
            }
            
            // Show Mars container
            const marsContainer = document.getElementById('mars-container');
            if (marsContainer) {
                marsContainer.style.display = 'block';
                
                if (!marsViz) {
                    try {
                        marsViz = new MarsVisualization('mars-container');
                    } catch (error) {
                        console.error('Error initializing Mars visualization:', error);
                    }
                } else {
                    // Resume Mars animations/controls
                    if (marsViz.controls) {
                        marsViz.controls.autoRotate = true;
                    }
                }
            }
            
            // Update mode buttons
            document.querySelectorAll('.mode-button').forEach(btn => {
                btn.classList.remove('active');
            });
            marsMode.classList.add('active');
        });
    }

    // Earth mode transition
    const earthMode = document.getElementById('earth-mode');
    if (earthMode) {
        earthMode.addEventListener('click', () => {
            // Show Earth globe
            const earthContainer = document.getElementById('earth-container');
            if (earthContainer) {
                earthContainer.style.display = 'block';
                // Resume Earth animations/controls
                if (app?.globe?.controls) {
                    app.globe.controls.autoRotate = true;
                }
            }
            
            // Hide Mars container
            const marsContainer = document.getElementById('mars-container');
            if (marsContainer) {
                marsContainer.style.display = 'none';
                // Optionally pause Mars animations/controls
                if (marsViz?.controls) {
                    marsViz.controls.autoRotate = false;
                }
            }

            // Update mode buttons
            document.querySelectorAll('.mode-button').forEach(btn => {
                btn.classList.remove('active');
            });
            earthMode.classList.add('active');
        });
    }


    // Set Earth mode as initially active
    if (earthMode) {
        earthMode.classList.add('active');
    }

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
            let selectedSatellite = null;
            
            if (app?.globe?.satellitesGroup) {
                app.globe.satellitesGroup.children.forEach(satelliteMesh => {
                    if (satelliteMesh.userData) {
                        satelliteData.push(satelliteMesh.userData);
                        // Check if this is the selected satellite
                        if (app.globe.selectedSatellite === satelliteMesh) {
                            selectedSatellite = satelliteMesh.userData;
                        }
                    }
                });
            }
            
            console.log('Sending satellite data to chat');

            let accumulatedText = '';
            const stream = await getSatelliteChatResponse(
                message, 
                satelliteData, 
                selectedSatellite,
                (newSatellites) => {
                    if (app?.globe) {
                        app.globe.updateSatellites(newSatellites);
                    }
                }
            );
            
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
        const earthContainer = document.getElementById('earth-container');
        const learnContent = document.getElementById('learn-content');
        const aboutContent = document.getElementById('about-content');
        const navLinks = document.querySelectorAll('nav a');
        const satelliteInfo = document.getElementById('satelliteInfo');

        // Remove active class from all links
        navLinks.forEach(link => link.classList.remove('active'));
        
        // Hide all content first
        earthContainer.style.display = 'none';
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
                earthContainer.style.display = 'block';
                document.querySelector('[data-page="home"]').classList.add('active');
                break;

            default:
                earthContainer.style.display = 'block';
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