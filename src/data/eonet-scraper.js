import axios from 'axios';

const BASE_URL = 'https://eonet.gsfc.nasa.gov/api/v3';

class EonetAPI {
    constructor() {
        this.axiosInstance = axios.create({
            baseURL: BASE_URL,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    async getEvents({
        source = '',
        status = '',
        limit = 100,
        days = 1000,
        // Add new optional parameters
        category = '',
        start = '',
        end = '',
        magID = '',
        magMin = '',
        magMax = '',
        bbox = ''
    } = {}) {
        try {
            console.log('Fetching EONET events with params:', { 
                source, status, limit, days, category, 
                start, end, magID, magMin, magMax, bbox 
            });

            const response = await this.axiosInstance.get('/events/geojson', {
                params: {
                    source,
                    status,
                    limit,
                    days,
                    // Add new parameters to API request
                    ...(category && { category }),
                    ...(start && { start }),
                    ...(end && { end }),
                    ...(magID && { magID }),
                    ...(magMin && { magMin }),
                    ...(magMax && { magMax }),
                    ...(bbox && { bbox })
                },
                timeout: 5000
            });

            console.log(`Number of features received: ${response.data.features.length}`);

            if (!response.data || !response.data.features) {
                throw new Error('No data received from EONET API');
            }

            // Transform the GeoJSON data to match our format
            const transformedEvents = response.data.features.map(feature => ({
                id: feature.properties.id,
                title: feature.properties.title,
                description: feature.properties.description,
                category: feature.properties.categories[0].title,
                status: feature.properties.closed ? 'closed' : 'open',
                coordinates: feature.geometry.coordinates,
                date: feature.properties.date,
                sources: feature.properties.sources
            }));

            console.log(`Number of transformed events: ${transformedEvents.length}`);
            return transformedEvents;

        } catch (error) {
            console.error('Error fetching EONET events:', error);
            return [];
        }
    }
}

export default EonetAPI;

// Test the API (uncomment to test)
const api = new EonetAPI();
api.getEvents({})
    .then(events => console.log('Test events:', events))
    .catch(console.error);