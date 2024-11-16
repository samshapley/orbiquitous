import Groq from "groq-sdk";
import fs from 'fs/promises';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

const groq = new Groq({
  apiKey: GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

// Add conversation history storage
let conversationHistory = [];

// Add function to reset conversation
export function resetConversation() {
    conversationHistory = [];
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

const SATELLITE_SYSTEM_PROMPT = `--- Time: ${timestamp} ---

You are "Orbit", an AI assistant for satellite tracking and analysis.

Here is the current satellite data being displayed on the globe to your user:

\${satelliteContext}

Please use this information when relevant to answer questions.
All responses should be generated using markdown, and line breaks should be used to separate messages.

You can use tools:

<SATELLITE_SEARCH>query</SATELLITE_SEARCH> will search for satellites with names matching the query.
`;

export async function getSatelliteChatResponse(userMessage, satelliteData) {
    const satelliteContext = satelliteData ? formatSatelliteData(satelliteData) : '';
    const systemPrompt = SATELLITE_SYSTEM_PROMPT.replace('${satelliteContext}', satelliteContext);
    
    // Add user message to conversation history
    conversationHistory.push({
        role: "user",
        content: userMessage,
    });
    
    // Create messages array with system prompt and conversation history
    const messages = [
        {
            role: "system",
            content: systemPrompt
        },
        ...conversationHistory
    ];
    
    // Save prompt to a local file
    try {
        
        // Create blob and download it
        const blob = new Blob([systemPrompt], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `prompt_log_${timestamp}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        // Also log to console for immediate debugging
        console.log('Debug Entry:', { systemPrompt, userMessage, satelliteData });
    } catch (error) {
        console.error('Failed to save debug log:', error);
    }
 
    try {
        const response = await groq.chat.completions.create({
            messages: messages,
            model: "llama3-8b-8192",
            temperature: 0.5,
            max_tokens: 1024,
            top_p: 1,
            stream: true,
        });

        // Store assistant's response in conversation history
        let fullResponse = '';
        
        // Create a proper async iterator that wraps the response
        const stream = {
            [Symbol.asyncIterator]: () => {
                const iterator = response[Symbol.asyncIterator]();
                return {
                    async next() {
                        try {
                            const { done, value } = await iterator.next();
                            if (!done) {
                                const content = value.choices[0]?.delta?.content || "";
                                fullResponse += content;
                                return { done: false, value };
                            } else {
                                // After collecting full response, add to history
                                conversationHistory.push({
                                    role: "assistant",
                                    content: fullResponse
                                });
                                return { done: true, value: undefined };
                            }
                        } catch (error) {
                            console.error('Error in stream iterator:', error);
                            throw error;
                        }
                    }
                };
            }
        };

        return stream;
    } catch (error) {
        console.error('Error in getSatelliteChatResponse:', error);
        throw error;
    }
}

function formatSatelliteData(satellites) {
    // Add debug logging
    console.log('Formatting satellite data:', satellites);
    
    if (!satellites || !Array.isArray(satellites)) {
        console.log('Invalid satellite data received');
        return 'No satellite data available.';
    }
    
    if (satellites.length === 0) {
        console.log('Empty satellite array received');
        return 'No satellite data available.';
    }
    
    return satellites.map(sat => {
        // Add null checks for each property
        const name = sat.name || 'Unknown';
        const id = sat.id || sat.satelliteId || 'Unknown';
        const lat = sat.latitude ? sat.latitude.toFixed(2) : 'Unknown';
        const long = sat.longitude ? sat.longitude.toFixed(2) : 'Unknown';
        const alt = sat.altitude ? sat.altitude.toFixed(2) : 'Unknown';
        
        return `Satellite Name: ${name}
        ID: ${id}
        Position: Lat ${lat}, Long ${long}, Alt ${alt}km`;
    }).join('\n\n');
}