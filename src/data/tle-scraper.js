import axios from 'axios';

const API_KEY = import.meta.env?.VITE_NASA_API_KEY || process.env.VITE_NASA_API_KEY;

// Using satellite.js to parse TLE data
const BASE_URL = 'https://tle.ivanstanojevic.me/api/tle';

class TleAPI {
    constructor() {
        this.axiosInstance = axios.create({
            baseURL: BASE_URL,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    async searchSatellites(query = '', limit = 1000) {
        try {
            const allSatellites = [];
            let page = 1;
            let totalResults = Infinity;

            while (allSatellites.length < totalResults) {
                // Log the request
                console.log('Searching satellites with query:', query, 'page:', page);

                const response = await this.axiosInstance.get('/', {
                    params: { search: query, page, limit },
                    timeout: 5000,
                    retry: 3,
                    retryDelay: 1000
                });

                // Log the raw response
                console.log('API Response:', response.data);

                if (!response.data) {
                    throw new Error('No data received from API');
                }

                const { member, total } = response.data;
                allSatellites.push(...member);
                totalResults = total;
                page++;
            }

            console.log('Transformed satellite data:', { member: allSatellites });
            return { member: allSatellites };
        } catch (error) {
            console.error('Error searching satellites:', error);
            return { member: [] };
        }
    }
}

export default TleAPI;

// // Remove or comment out the test call
// const api = new TleAPI();
// api.searchSatellites().catch(console.error);