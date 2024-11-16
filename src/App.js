import GlobeVisualization from './components/Globe.js';
import TleAPI from './data/tle-scraper.js';
import EonetAPI from './data/eonet-scraper.js';

class App {
    constructor() {
        // Bind methods
        this.handleSatelliteClick = this.handleSatelliteClick.bind(this);
        this.closeSatelliteInfo = this.closeSatelliteInfo.bind(this);
    
        // Initialize GlobeVisualization with a callback for satellite clicks
        this.globe = new GlobeVisualization('globe-container');
        this.tleApi = new TleAPI();
        this.eonetApi = new EonetAPI();

        this.initSatelliteInfoElements();
    
        this.initControlPanel();

        this.satellitesGroup = null;

    }

    initControlPanel() {
        const controlPanel = document.getElementById('mode-controls');
        
        // Add event listeners to mode buttons
        document.getElementById('satellite-mode').addEventListener('click', () => this.enableMode('satellite'));
        document.getElementById('weather-mode').addEventListener('click', () => this.enableMode('weather'));
        document.getElementById('forest-mode').addEventListener('click', () => this.enableMode('forest'));
    }

    async enableMode(mode) {
        // Clear current globe state
        this.globe.clearGlobe();
        
        // Handle different modes
        switch(mode) {
            case 'satellite':
                // Initialize satellite mode first, then fetch and update data
                this.globe.enableSatelliteMode(this.handleSatelliteClick);
                try {
                    console.log('Fetching satellite data...');
                    const response = await this.tleApi.searchSatellites('Starlink');
                    if (response && response.member) {
                        console.log('Updating globe with satellite data:', response.member);
                        this.globe.updateSatellites(response.member);
                    } else {
                        console.warn('No satellite data available to update globe');
                    }
                } catch (error) {
                    console.error('Error fetching satellite data:', error);
                }
                break;
            case 'weather':
                // Placeholder for weather mode
                await this.enableWeatherMode();
                console.log('Weather mode selected');
                break;
            case 'forest':
                // Placeholder for forest mode
                console.log('Forest mode selected');
                break;
        }
    }

    async enableWeatherMode() {
        try {
            if (!this.eonetApi) {
                throw new Error('EONET API not initialized');
            }
    
            const events = await this.eonetApi.getEvents({
                status: 'open',
                category: 'severeStorms',
                limit: 50
            });
    
            if (!events || events.length === 0) {
                console.warn('No weather events found');
                return;
            }
    
            // Process events to get latest position for each unique event
            const latestEvents = this.processEvents(events);
            
            // Update globe with weather events
            this.globe.updateWeatherEvents(latestEvents);
        } catch (error) {
            console.error('Error fetching weather events:', error);
            // Optionally add user feedback here
        }
    }

    processEvents(events) {
        // Create a map to store the latest event for each unique ID
        const eventMap = new Map();

        events.forEach(event => {
            const existingEvent = eventMap.get(event.id);
            if (!existingEvent || new Date(event.date) > new Date(existingEvent.date)) {
                eventMap.set(event.id, event);
            }
        });

        return Array.from(eventMap.values());
    }

    async initialize() {
        try {
            console.log('Initializing App...');
            
            // Fetch satellite data
            const response = await this.tleApi.searchSatellites('Starlink');
            console.log('API Response in App:', response);
            
            // Update globe with satellite data
            if (response && response.member) {
                console.log('Updating globe with satellite data:', response.member);
                this.globe.updateSatellites(response.member);
            } else {
                console.warn('No satellite data available to update globe');
            }
        } catch (error) {
            console.error('Error initializing satellites:', error);
        }
    }

    initSatelliteInfoElements() {
        this.satelliteInfoContainer = document.getElementById('satelliteInfo');
        this.satelliteName = document.getElementById('satelliteName');
        this.satelliteId = document.getElementById('satelliteId');
        this.satelliteLat = document.getElementById('satelliteLat');
        this.satelliteLng = document.getElementById('satelliteLng');
        this.satelliteAlt = document.getElementById('satelliteAlt');
        this.closeButton = document.getElementById('closeInfo');

        // Add event listener to close button
        if (this.closeButton) {
            this.closeButton.addEventListener('click', this.closeSatelliteInfo);
        }
    }

    handleSatelliteClick(satellite) {
        console.log('Handling satellite click:', satellite);
        
        // Check if elements exist
        if (!this.satelliteName || !this.satelliteId || !this.satelliteLat || 
            !this.satelliteLng || !this.satelliteAlt) {
            console.error('Satellite info elements not properly initialized');
            return;
        }
    
        // Populate satellite info
        this.satelliteName.textContent = satellite.name || 'N/A';
        this.satelliteId.textContent = satellite.id || 'N/A';
        this.satelliteLat.textContent = satellite.latitude.toFixed(2) || 'N/A';
        this.satelliteLng.textContent = satellite.longitude.toFixed(2) || 'N/A';
        this.satelliteAlt.textContent = satellite.altitude.toFixed(2) || 'N/A';
    
        // Show satellite info container
        this.showSatelliteInfo();
    }

    showSatelliteInfo() {
        const satelliteInfo = this.satelliteInfoContainer;
        
        if (satelliteInfo) {
            // Remove hidden first, then add visible
            satelliteInfo.style.display = 'block';
            satelliteInfo.classList.remove('hidden');
            // Use setTimeout to ensure the transition works
            setTimeout(() => {
                satelliteInfo.classList.add('visible');
            }, 10);
        }
    }
    
    // Update the closeSatelliteInfo method
    closeSatelliteInfo() {
        const satelliteInfo = this.satelliteInfoContainer;
        
        if (satelliteInfo) {
            satelliteInfo.classList.remove('visible');
            satelliteInfo.classList.add('hidden');
            // Wait for transition to complete before hiding
            setTimeout(() => {
                satelliteInfo.style.display = 'none';
            }, 300); // Match this with your CSS transition duration
        }
        
        this.globe.resetSelection();
    }

}

export default App;