import GlobeVisualization from './components/Globe.js';
import TleAPI from './data/tle-scraper.js';

class App {
    constructor() {
        // Bind methods
        this.handleSatelliteClick = this.handleSatelliteClick.bind(this);
        this.closeSatelliteInfo = this.closeSatelliteInfo.bind(this);

        // Initialize GlobeVisualization with a callback for satellite clicks
        this.globe = new GlobeVisualization('globe-container', this.handleSatelliteClick);
        this.tleApi = new TleAPI();

        // Initialize satellite info elements
        this.initSatelliteInfoElements();
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
        const globeContainer = document.getElementById('globe-container');
        const satelliteInfo = this.satelliteInfoContainer;

        if (globeContainer && satelliteInfo) {
            globeContainer.classList.add('shifted');
            satelliteInfo.classList.remove('hidden');
            satelliteInfo.classList.add('visible');
        }
    }

    closeSatelliteInfo() {
        const globeContainer = document.getElementById('globe-container');
        const satelliteInfo = this.satelliteInfoContainer;

        if (globeContainer && satelliteInfo) {
            globeContainer.classList.remove('shifted');
            satelliteInfo.classList.remove('visible');
            satelliteInfo.classList.add('hidden');
        }

        this.globe.resetSelection();
    }

}

export default App;