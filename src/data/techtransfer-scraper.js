import axios from 'axios';

// Base URL for NASA's Technology Transfer API
const BASE_URL = 'https://api.nasa.gov/techtransfer';

class TechTransferAPI {
    constructor() {
        // Try multiple sources for the API key
        const apiKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_NASA_API_KEY) || 
                      process.env.NASA_API_KEY || 
                      'DEMO_KEY';
        
        this.axiosInstance = axios.create({
            baseURL: BASE_URL,
            headers: {
                'Content-Type': 'application/json'
            },
            params: {
                api_key: apiKey
            }
        });
    }

    /**
     * Generic method to fetch data from a specific endpoint with pagination
     * @param {string} endpoint - The API endpoint (e.g., 'patent', 'software', 'spinoff')
     * @param {object} params - Additional query parameters
     * @param {number} limit - Number of records per page
     * @returns {object} - Aggregated results from all pages
     */
    async fetchData(endpoint, params = {}, limit = 1) {
        try {
            const allResults = [];
            let page = 1; // NASA API uses 0-based pagination
            let totalResults = Infinity;
    
            while (allResults.length < totalResults) {
                console.log(`Fetching ${endpoint} data - Query Params:`, { ...params, page, limit });
    
                const response = await this.axiosInstance.get(`/${endpoint}/`, {
                    params: { ...params, page, limit },
                    timeout: 5000,
                    retry: 3,
                    retryDelay: 1000
                });
    
                console.log('API Response:', response.data);
    
                if (!response.data) {
                    throw new Error('No data received from API');
                }
    
                // Handle the actual API response structure
                const { results, count, total } = response.data;
                if (!results) {
                    throw new Error('No results array in API response');
                }
    
                allResults.push(...results);
                totalResults = total || count; // Use total or count depending on what's available
                page++;
    
                // Break if we've received all results or if there are no more pages
                if (allResults.length >= totalResults || results.length === 0) {
                    break;
                }
            }
    
            console.log(`Transformed ${endpoint} data:`, { results: allResults });
            return { results: allResults };
        } catch (error) {
            console.error(`Error fetching ${endpoint} data:`, error);
            return { results: [] };
        }
    }

    /**
     * Search NASA Patents
     * @param {string} query - Search string for patents
     * @param {number} limit - Number of records per page
     * @returns {object} - Search results
     */
    async searchPatents(query = '', limit = 1000) {
        return this.fetchData('patent', { patent: query }, limit);
    }

    /**
     * Search NASA Software
     * @param {string} query - Search string for software
     * @param {number} limit - Number of records per page
     * @returns {object} - Search results
     */
    async searchSoftware(query = '', limit = 1000) {
        return this.fetchData('software', { software: query }, limit);
    }

    /**
     * Search NASA Spinoff Examples
     * @param {string} query - Search string for spinoff examples
     * @param {number} limit - Number of records per page
     * @returns {object} - Search results
     */
    async searchSpinoff(query = '', limit = 1000) {
        return this.fetchData('spinoff', { Spinoff: query }, limit);
    }
}

export default TechTransferAPI;

// Example usage:
const techTransferAPI = new TechTransferAPI();
techTransferAPI.searchPatents('solar').then(console.log).catch(console.error);