import App from './src/App.js';
import { getSatelliteChatResponse, getCurriculumResponse, getTechChatResponse, resetConversation } from './groq_api.js';

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    let app;
    try {
        app = new App(); 
        await app.init();
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

    // Set Earth mode as initially active
    const earthMode = document.getElementById('earth-mode');
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

        // Add loading bar container
        const loadingBar = document.createElement('div');
        loadingBar.className = 'tool-call-loading';
        loadingBar.style.display = 'none';
        assistantMessageDiv.appendChild(loadingBar);
    
        try {
            // Get satellite data from the globe's satellitesGroup
            const satelliteData = [];
            let selectedSatellite = null;
            
            if (app?.earth?.satellitesGroup) {
                app.earth.satellitesGroup.children.forEach(satelliteMesh => {
                    if (satelliteMesh.userData) {
                        satelliteData.push(satelliteMesh.userData);
                        // Check if this is the selected satellite
                        if (app.earth.selectedSatellite === satelliteMesh) {
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
                    // Show loading bar during tool call
                    loadingBar.style.display = 'block';
                    
                    if (app?.earth) {
                        app.earth.updateSatellites(newSatellites);
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
            loadingBar.style.display = 'none';
        } catch (error) {
            loadingBar.style.display = 'none';
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

    // Add tech chat functionality
    const techChatInput = document.getElementById('tech-chat-input');
    const techSendButton = document.getElementById('tech-send-message');
    const techChatMessages = document.getElementById('tech-chat-messages');

    const curriculumContainer = document.createElement('div');
    curriculumContainer.id = 'curriculum-container';
    curriculumContainer.className = 'curriculum-container';
    document.querySelector('.quadrant-11').appendChild(curriculumContainer);

    if (techChatInput && techSendButton && techChatMessages) {
        async function handleTechChat() {
            const message = techChatInput.value.trim();
            if (!message) return;

            // Get current patent data
            const tableContainer = document.getElementById('patent-explorer');
            const selectedPatent = document.querySelector('.patent-row.selected');
            const patentsData = tableContainer?.patentsData || [];
            const selectedPatentData = selectedPatent ? 
                patentsData[selectedPatent.dataset.patentIndex] : null;

            // Add user message to chat
            const userMessageDiv = document.createElement('div');
            userMessageDiv.className = 'message user-message';
            userMessageDiv.textContent = message;
            techChatMessages.appendChild(userMessageDiv);

            // Clear input
            techChatInput.value = '';

            // Create assistant message container
            const assistantMessageDiv = document.createElement('div');
            assistantMessageDiv.className = 'message assistant-message';
            techChatMessages.appendChild(assistantMessageDiv);

            // Add loading bar container
            const loadingBar = document.createElement('div');
            loadingBar.className = 'tool-call-loading';
            loadingBar.style.display = 'none';
            assistantMessageDiv.appendChild(loadingBar);

            try {
                let accumulatedText = '';
                const stream = await getTechChatResponse(
                    message, 
                    patentsData, 
                    selectedPatentData,
                    (patent) => {
                        // Show loading bar during tool call
                        loadingBar.style.display = 'block';
                        // Find the row with this patent
                        const patentRow = document.querySelector(`.patent-row[data-patent-index="${patentsData.findIndex(p => p[1] === patent[1])}"]`);
                        if (patentRow) {
                            // Simulate click on the row
                            const clickEvent = new Event('click', { bubbles: true });
                            patentRow.dispatchEvent(clickEvent);
                            
                            // Scroll the row into view
                            patentRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    },
                    async (patentId, topic, style) => {
                        // Clear previous curriculum
                        curriculumContainer.innerHTML = '';
                        const loadingBarDiv = document.createElement('div');
                        loadingBarDiv.className = 'tool-call-loading';
                        curriculumContainer.appendChild(loadingBarDiv);
                
                        try {
                            // Stream curriculum to quadrant-11
                            let curriculumText = '';
                            const curriculumStream = getCurriculumResponse(patentId, topic, style, patentsData);
                            
                            for await (const chunk of curriculumStream) {
                                if (chunk.choices[0]?.delta?.content) {
                                    curriculumText += chunk.choices[0].delta.content;
                                    // Remove loading bar before updating content
                                    if (loadingBarDiv) {
                                        loadingBarDiv.remove();
                                    }
                                    curriculumContainer.innerHTML = marked.parse(curriculumText);
                                    // Syntax highlighting for code blocks (optional)
                                    curriculumContainer.querySelectorAll('pre code').forEach((block) => {
                                        hljs.highlightElement(block);
                                    });
                                }
                            }
                        } catch (error) {
                            console.error('Error streaming curriculum:', error);
                            curriculumContainer.innerHTML = 'Error generating curriculum';
                        } finally {
                            // Ensure loading bar is removed even if there's an error
                            if (loadingBarDiv) {
                                loadingBarDiv.remove();
                            }
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
                    techChatMessages.scrollTop = techChatMessages.scrollHeight;
                }
                loadingBar.style.display = 'none';
            } catch (error) {
                loadingBar.style.display = 'none';
                console.error('Tech chat error:', error);
                assistantMessageDiv.textContent = 'Sorry, there was an error processing your request.';
            }
        }

        techSendButton.addEventListener('click', handleTechChat);
        techChatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleTechChat();
            }
        });
    }

    // Handle navigation
    const handleNavigation = (path) => {
        const visualizationContainer = document.getElementById('visualization-container');
        const spaceTechContent = document.getElementById('space-tech-content');
        const visionContent = document.getElementById('vision-content');
        const navLinks = document.querySelectorAll('nav a');
        const satelliteInfo = document.getElementById('satelliteInfo');
        const chatPanel = document.getElementById('chat-panel');  // Add this line
        const toggleChatButton = document.getElementById('toggleChat');  // Add this line

        // Remove active class from all links
        navLinks.forEach(link => link.classList.remove('active'));
        
        // Hide all content first
        visualizationContainer.style.display = 'none';
        spaceTechContent.style.display = 'none';
        visionContent.style.display = 'none';
        if (satelliteInfo) {
            satelliteInfo.style.display = 'none'; // Ensure info container is hidden on navigation
        }
        // Hide chat panel and update button text when switching tabs
        if (chatPanel) {
            chatPanel.style.display = 'none';
            if (toggleChatButton) {
                toggleChatButton.textContent = 'Talk to Orbit';
            }
        }
        
        // Show appropriate content based on path
        switch(path) {
            case '/space-tech':
                spaceTechContent.style.display = 'block';
                document.querySelector('[data-page="space-tech"]').classList.add('active');
                break;
            case '/vision':
                visionContent.style.display = 'block';
                document.querySelector('[data-page="vision"]').classList.add('active');
                break;
            case '/orbital-explorer':
                visualizationContainer.style.display = 'block';
                document.querySelector('[data-page="orbital-explorer"]').classList.add('active');
                break;
            default:
                visualizationContainer.style.display = 'block';
                document.querySelector('[data-page="orbital-explorer"]').classList.add('active');
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