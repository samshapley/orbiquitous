import EarthVisualization from './components/Earth.js';
import TleAPI from './data/tle-scraper.js';

class App {
    constructor() {
        // Bind methods
        this.handleSatelliteClick = this.handleSatelliteClick.bind(this);
        this.closeSatelliteInfo = this.closeSatelliteInfo.bind(this);
    
        // Initialize properties
        this.globe = null;
        this.tleApi = new TleAPI();
        this.satellitesGroup = null;

        // Initialize after a short delay to ensure DOM is ready
        this.init();
    }

    async init() {
        // Initialize components
        this.initializeComponents();
        
        // Initialize satellite data
        try {
            console.log('Fetching initial satellite data...');
            const response = await this.tleApi.searchSatellites('Starlink');
            if (response && response.member) {
                console.log('Updating globe with initial satellite data:', response.member);
                this.globe.enableSatelliteMode(this.handleSatelliteClick);
                this.globe.updateSatellites(response.member);
            } else {
                console.warn('No initial satellite data available');
            }
        } catch (error) {
            console.error('Error fetching initial satellite data:', error);
        }
    }

    initializeComponents() {
        // Initialize globe only after container is available
        const earthContainer = document.getElementById('earth-container');
        if (earthContainer) {
            this.globe = new EarthVisualization('earth-container');
        }

        this.initSatelliteInfoElements();
        this.initControlPanel();
    }

    initControlPanel() {
        const controlPanel = document.getElementById('mode-controls');
        if (!controlPanel) {
            console.error('Control panel element not found. Make sure the HTML includes an element with id "mode-controls"');
            return;
        }

        const controls = {
            'earth-mode': () => this.enableMode('earth'),
            'mars-mode': () => this.enableMode('mars'),
        };

        // Add listeners for each control
        Object.entries(controls).forEach(([id, handler]) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', handler);
            } else {
                console.error(`Control button "${id}" not found`);
            }
        });
    }

    async enableMode(mode) {
        // Clear current globe state
        this.globe.clearEarth();
        
        // Get containers
        const earthContainer = document.getElementById('earth-container');
        const marsContainer = document.getElementById('mars-container');
        const chatPanel = document.getElementById('chat-panel');
        
        // Hide chat panel by default
        if (chatPanel) chatPanel.style.display = 'none';
        
        // Handle different modes
        switch(mode) {
            case 'earth':
                if (earthContainer) earthContainer.style.display = 'block';
                if (marsContainer) marsContainer.style.display = 'none';
                
                // Re-initialize satellite data
                try {
                    this.globe.enableSatelliteMode(this.handleSatelliteClick);
                    const response = await this.tleApi.searchSatellites('Starlink');
                    if (response && response.member) {
                        this.globe.updateSatellites(response.member);
                    }
                } catch (error) {
                    console.error('Error fetching satellite data:', error);
                }
                break;

            case 'mars':
                if (earthContainer) earthContainer.style.display = 'none';
                if (marsContainer) marsContainer.style.display = 'block';
                break;
            case 'mars':
                if (earthContainer) earthContainer.style.display = 'none';
                if (marsContainer) marsContainer.style.display = 'block';
                break;
    
        }
    }

    async initialize() {
        try {
            console.log('Initializing App...');
            
            // Fetch satellite data
            const response = await this.tleApi.searchSatellites('Starlink');
            console.log('API Response in App:', response);
            
            // Update globe with satellite data
            if (response && response.member) {
                console.log('Updating earth with satellite data:', response.member);
                this.globe.updateSatellites(response.member);
            } else {
                console.warn('No satellite data available to update earth');
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