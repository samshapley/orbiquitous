import Groq from "groq-sdk";
import TleAPI from './src/data/tle-scraper.js';

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

You are Orbit, an AI assistant for Space. Introduce yourself to the user as Orbit.
This session is for satellite tracking and analysis.
You can also search for specific satellites by name using the tool provided. You do not need to search for every response, as the required information may already be available.
All responses should be generated using markdown, and line breaks should be used to separate messages.
When a user says "this satellite", they are referring to the currently selected satellite.
End your responses with <COMPLETE> to signal the end of your response.`;

// Define the tools array
const satellite_tools = [
    {
        type: "function",
        function: {
            name: "search_satellites",
            description: "This tool should be called to search for satellites by name",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "The search query for satellite names",
                    }
                },
                required: ["query"],
            },
        },
    }
];

export async function* getSatelliteChatResponse(userMessage, satelliteData, selectedSatellite, onSatelliteUpdate) {
    const satelliteContext = satelliteData ? formatSatelliteData(satelliteData, selectedSatellite) : '';
    const systemPrompt = SATELLITE_SYSTEM_PROMPT
    
    // Start with system prompt in conversation history if it's empty
    if (conversationHistory.length === 0) {
        conversationHistory.push({
            role: "system",
            content: systemPrompt
        });
        // Add satellite context as the first user message
        conversationHistory.push({
            role: "user",
            content: satelliteContext,
        });
    } else {
        // Update the first user message (index 1) with the latest satellite context
        if (conversationHistory.length > 1) {
            conversationHistory[1] = {
                role: "user",
                content: satelliteContext,
            };
        }
    }
    
    // Add user message to conversation history
    conversationHistory.push({
        role: "user",
        content: userMessage,
    });


    // Save prompt to a local file
    // try {
        
    //     // Create blob and download it
    //     const blob = new Blob([systemPrompt], { type: 'text/plain' });
    //     const url = URL.createObjectURL(blob);
    //     const link = document.createElement('a');
    //     link.href = url;
    //     link.download = `prompt_log_${timestamp}.txt`;
    //     document.body.appendChild(link);
    //     link.click();
    //     document.body.removeChild(link);
    //     URL.revokeObjectURL(url);
        
    //     // Also log to console for immediate debugging
    //     console.log('Debug Entry:', { systemPrompt, userMessage, satelliteData });
    // } catch (error) {
    //     console.error('Failed to save debug log:', error);
    // }
 
    try {
        let shouldContinue = true;
        let fullResponse = '';
        
        while (shouldContinue) {
            console.log('Sending messages to GROQ:', conversationHistory);
            const response = await groq.chat.completions.create({
                messages: conversationHistory,
                model: "llama-3.1-70b-versatile",
                temperature: 0.5,
                max_tokens: 1024,
                top_p: 1,
                stream: true,
                tools: satellite_tools,
                parallel_tool_calls: false,
                tool_choice: "auto",
                stop: ["<COMPLETE>"]
            });

            let toolCallFound = false;
            let currentToolCall = null;

            for await (const chunk of response) {
                if (chunk.choices[0]?.delta?.tool_calls) {
                    console.log('Tool call found:', chunk.choices[0].delta.tool_calls);
                    const toolCall = chunk.choices[0].delta.tool_calls[0];
                    if (toolCall?.function?.name === 'search_satellites') {
                        toolCallFound = true;
                        currentToolCall = toolCall;
                        const args = JSON.parse(toolCall.function.arguments);
                        const tleApi = new TleAPI();
                        const searchResults = await tleApi.searchSatellites(args.query);
                        
                        if (onSatelliteUpdate && searchResults?.member) {
                            onSatelliteUpdate(searchResults.member);
                        }
                        
                        conversationHistory.push({
                            role: "tool",
                            name: "search_satellites",
                            tool_call_id: toolCall.id,
                            content: JSON.stringify(searchResults)
                        });

                    }
                }
                
                if (chunk.choices[0]?.delta?.content) {
                    fullResponse += chunk.choices[0].delta.content;
                    yield chunk;
                }

            }
            
            // Store assistant response in conversation history
            if (fullResponse) {
                conversationHistory.push({
                    role: "assistant",
                    content: fullResponse
                });
            }

            // If no tool call was found, we're done
            shouldContinue = toolCallFound;

        
        }

        return fullResponse;
    } catch (error) {
        console.error('Error in getSatelliteChatResponse:', error);
        throw error;
    }
}

function formatSatelliteData(satellites, selectedSatellite) {
    // Add debug logging
    console.log('Formatting satellite data:', satellites);
    console.log('Selected satellite:', selectedSatellite);
    
    if (!satellites || !Array.isArray(satellites)) {
        console.log('Invalid satellite data received');
        return 'No satellite data available.';
    }
    
    if (satellites.length === 0) {
        console.log('Empty satellite array received');
        return 'No satellite data available.';
    }
    
    let output = '';
    
    // First add selected satellite if one exists
    if (selectedSatellite) {
        console.log('Adding selected satellite to prompt');
        output += `The user has access to a map of satellites, and has got the current satellite selected:
        Name: ${selectedSatellite.name || 'Unknown'}
        ID: ${selectedSatellite.id || 'Unknown'}
        Position: Lat ${selectedSatellite.latitude?.toFixed(2) || 'Unknown'}, Long ${selectedSatellite.longitude?.toFixed(2) || 'Unknown'}, Alt ${selectedSatellite.altitude?.toFixed(2) || 'Unknown'}km\n\n`;
    }
    
    output += 'Here are the other satellites currently displayed on the Earth:\n\n';
    
    // Then add other satellites
    output += satellites
        .filter(sat => !selectedSatellite || sat.id !== selectedSatellite.id)
        .map(sat => {
            const name = sat.name || 'Unknown';
            const id = sat.id || sat.id || 'Unknown';
            const lat = sat.latitude ? sat.latitude.toFixed(2) : 'Unknown';
            const long = sat.longitude ? sat.longitude.toFixed(2) : 'Unknown';
            const alt = sat.altitude ? sat.altitude.toFixed(2) : 'Unknown';
            
            return `Satellite Name: ${name}
            ID: ${id}
            Position: Lat ${lat}, Long ${long}, Alt ${alt}km`;
        }).join('\n\n');
    
    return output;

}

const tech_tools = [
    {
        type: "function",
        function: {
            name: "select_patent",
            description: "This tool should be called to select and display details for a specific patent",
            parameters: {
                type: "object",
                properties: {
                    patentId: {
                        type: "string",
                        description: "The ID of the patent to select",
                    }
                },
                required: ["patentId"],
            },
        },
    }
];

const TECH_CHAT_SYSTEM_PROMPT = `--- Time: ${timestamp} ---
You are Orbit, an AI assistant for Space. Introduce yourself to the user as Orbit.
This session is for discussion of technical concepts via actual NASA patents as a grounding point.
Answer all questions in a technical manner, and provide detailed explanations where necessary.
You have the ability to select a specific patent for further discussion. Do this if the user asks for more information about a specific patent, or for you to choose a patent.
`

export async function* getTechChatResponse(userMessage, patents=[], selectedPatent=null, onPatentSelect) {
    const patentContext = formatPatentData(patents, selectedPatent);
    const systemPrompt = TECH_CHAT_SYSTEM_PROMPT;
    
    // Start with system prompt in conversation history if it's empty
    if (conversationHistory.length === 0) {
        conversationHistory.push({
            role: "system",
            content: systemPrompt
        });
        // Add initial patent context as the first user message
        conversationHistory.push({
            role: "user",
            content: patentContext,
        });
    } else {
        // Update the patent context message if it exists, or add it if it doesn't
        const contextIndex = conversationHistory.findIndex(msg => 
            msg.role === "user" && msg.content.includes("Here are some other available patents:")
        );
        
        if (contextIndex !== -1) {
            conversationHistory[contextIndex] = {
                role: "user",
                content: patentContext,
            };
        } else {
            conversationHistory.splice(1, 0, {
                role: "user",
                content: patentContext,
            });
        }
    }
    
    // Add user message to conversation history
    conversationHistory.push({
        role: "user",
        content: userMessage,
    });


    // Save prompt to a local file
    // try {
        
    //     // Create blob and download it
    //     const blob = new Blob([systemPrompt], { type: 'text/plain' });
    //     const url = URL.createObjectURL(blob);
    //     const link = document.createElement('a');
    //     link.href = url;
    //     link.download = `prompt_log_${timestamp}.txt`;
    //     document.body.appendChild(link);
    //     link.click();
    //     document.body.removeChild(link);
    //     URL.revokeObjectURL(url);
        
    //     // Also log to console for immediate debugging
    //     console.log('Debug Entry:', { systemPrompt, userMessage, satelliteData });
    // } catch (error) {
    //     console.error('Failed to save debug log:', error);
    // }
 
    try {
        let shouldContinue = true;
        let fullResponse = '';
        
        while (shouldContinue) {
            console.log('Sending messages to GROQ:', conversationHistory);
            const response = await groq.chat.completions.create({
                messages: conversationHistory,
                model: "llama-3.1-70b-versatile",
                temperature: 0.5,
                max_tokens: 1024,
                top_p: 1,
                tools: tech_tools,
                tool_choice: "auto",
                parallel_tool_calls: false,
                stream: true,
                stop: ["<COMPLETE>"]
            });

            let toolCallFound = false;
            let currentToolCall = null;

            for await (const chunk of response) {
                if (chunk.choices[0]?.delta?.tool_calls) {
                    console.log('Tool call found:', chunk.choices[0].delta.tool_calls);
                    const toolCall = chunk.choices[0].delta.tool_calls[0];
                    if (toolCall?.function?.name === 'select_patent') {
                        toolCallFound = true;
                        currentToolCall = toolCall;
                        const args = JSON.parse(toolCall.function.arguments);
                        
                        // Find the patent in the patents array
                        const patent = patents.find(p => p[1] === args.patentId);
                        
                        if (patent && onPatentSelect) {
                            onPatentSelect(patent);
                        }
                        
                        conversationHistory.push({
                            role: "tool",
                            name: "select_patent",
                            tool_call_id: toolCall.id,
                            content: patent ? JSON.stringify(patent) : "Patent not found"
                        });
                    }
                }
                
                if (chunk.choices[0]?.delta?.content) {
                    fullResponse += chunk.choices[0].delta.content;
                    yield chunk;
                }

            }
            
            // Store assistant response in conversation history
            if (fullResponse.trim()) {
                conversationHistory.push({
                    role: "assistant",
                    content: fullResponse
                });
            }

            // If no tool call was found, we're done
            shouldContinue = toolCallFound;  // Changed this line - remove the response check
            // Reset fullResponse for the next iteration if we're continuing
            if (shouldContinue) {
                fullResponse = '';
            }

        
        }

        return fullResponse;
    } catch (error) {
        console.error('Error in getTechChatResponse:', error);
        throw error;
    }
}

function formatPatentData(patents, selectedPatent) {
    if (!patents || !Array.isArray(patents)) {
        return 'No patent data available.';
    }
    
    let output = '';
    
    // First add selected patent if one exists
    if (selectedPatent) {
        output += `The user is currently viewing this patent:
        Title: ${selectedPatent[2] || 'Unknown'}
        ID: ${selectedPatent[1] || 'Unknown'}
        Description: ${selectedPatent[3] || 'Unknown'}
        Category: ${selectedPatent[5] || 'Unknown'}
        Center: ${selectedPatent[9] || 'Unknown'}\n\n`;
    }
    
    output += 'Here are some other available patents:\n\n';
    
    output += patents
        .filter(pat => !selectedPatent || pat[1] !== selectedPatent[1])
        .slice(0, 20)
        .map(pat => {
            return `Patent Title: ${pat[2] || 'Unknown'}
            ID: ${pat[1] || 'Unknown'}
            Category: ${pat[5] || 'Unknown'}`;
        }).join('\n\n');
    
    return output;
}
