import EarthVisualization from './components/Earth.js';
import MoonVisualization from './components/Moon.js';
import MarsVisualization from './components/Mars.js';
import TleAPI from './data/tle-scraper.js';

class App {
    constructor() {
        // Bind methods
        this.handleSatelliteClick = this.handleSatelliteClick.bind(this);
        this.closeSatelliteInfo = this.closeSatelliteInfo.bind(this);
    
        // Initialize properties
        this.earth = null;
        this.moon = null;
        this.mars = null;
        this.tleApi = new TleAPI();
        this.satellitesGroup = null;
    }

    async init() {
        try {
            // Initialize components first
            this.initializeComponents();
            
            if (this.earth) {
                this.earth.enableSatelliteMode(this.handleSatelliteClick);
                // Load initial satellite data
                try {
                    const response = await this.tleApi.searchSatellites();
                    if (response && response.member) {
                        // Delay satellite loading until Earth is ready
                        setTimeout(() => {
                            this.earth.updateSatellites(response.member);
                        }, 1000); // Match this with Earth's loading sequence
                    }
                } catch (error) {
                    console.error('Error fetching initial satellite data:', error);
                }
            }

        } catch (error) {
            console.error('Error during initialization:', error);
        }
    }

    initializeComponents() {
        // Initialize globe only after container is available
        const earthContainer = document.getElementById('earthViz');
        if (earthContainer) {
            this.earth = new EarthVisualization('earthViz');
        }

        const moonContainer = document.getElementById('moonViz');
        if (moonContainer) {
            this.moon = new MoonVisualization('moonViz');
        }

        // Initialize Mars visualization
        const marsContainer = document.getElementById('marsViz');
        if (marsContainer) {
            this.mars = new MarsVisualization('marsViz');
        }

        this.initSatelliteInfoElements();
        this.initControlPanel();
        this.initLearnPage();
    }

    initControlPanel() {
        const controlPanel = document.getElementById('mode-controls');
        if (!controlPanel) {
            console.error('Control panel element not found. Make sure the HTML includes an element with id "mode-controls"');
            return;
        }

        const controls = {
            'earth-mode': () => this.enableMode('earth'),
            'moon-mode': () => this.enableMode('moon'),
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

    async initLearnPage() {
        const spaceTechContent = document.getElementById('space-tech-content');
        if (!spaceTechContent) return;
    
        try {
            const TechTransferAPI = (await import('./data/techtransfer-scraper.js')).default;
            const api = new TechTransferAPI();
            const { results } = await api.searchPatents();
            
            if (results && results.length > 0) {
                this.updatePatentTable(results);
            }
        } catch (error) {
            console.error('Error loading patent data:', error);
        }
    }
    
    updatePatentTable(patents) {
        const tableContainer = document.getElementById('patent-explorer');
        if (!tableContainer) return;
    
        // Create table rows with safer data handling
        const tableHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>ID</th>
                        <th>Category</th>
                        <th>Center</th>
                    </tr>
                </thead>
                <tbody>
                    ${patents.map((patent, index) => `
                        <tr class="patent-row" data-patent-index="${index}">
                            <td>${patent[2] || 'N/A'}</td>
                            <td>${patent[1] || 'N/A'}</td>
                            <td>${patent[5] || 'N/A'}</td>
                            <td>${patent[9] || 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    
        tableContainer.innerHTML = tableHTML;
    
        // Store patents data separately
        tableContainer.patentsData = patents;
    
        // Add click event listeners
        const rows = tableContainer.querySelectorAll('.patent-row');
        rows.forEach(row => {
            row.addEventListener('click', (event) => {
                const index = parseInt(row.dataset.patentIndex);
                const patentData = tableContainer.patentsData[index];
                if (patentData) {
                    this.handlePatentClick(patentData, event);
                }
            });
        });

        // Add random patent button functionality
        const randomButton = document.getElementById('random-patent');
        if (randomButton) {
            randomButton.addEventListener('click', () => {
                const rows = tableContainer.querySelectorAll('.patent-row');
                if (rows.length) {
                    const randomIndex = Math.floor(Math.random() * rows.length);
                    const randomRow = rows[randomIndex];
                    
                    // Scroll the row into view
                    randomRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Simulate click after scrolling
                    setTimeout(() => {
                        const clickEvent = new Event('click', { bubbles: true });
                        randomRow.dispatchEvent(clickEvent);
                    }, 500);
                }
            });
        }

    }

    handlePatentClick(patentData, event) {
        console.log('Selected patent:', patentData);
        document.querySelectorAll('.patent-table-container tbody tr').forEach(row => {
            row.classList.remove('selected');
        });
        
        // Add selected class to clicked row
        event.currentTarget.classList.add('selected');
        
        // Update the details panel
        document.getElementById('selected-patent-title').textContent = patentData[2]; // Title
        document.getElementById('selected-patent-description').textContent = patentData[3]; // Description
        
        // Construct NASA Tech Transfer link from patent ID
        const linkButton = document.getElementById('selected-patent-link');
        const patentId = patentData[1]; // Get patent ID
        if (patentId) {
            const nasaLink = `https://technology.nasa.gov/patent/${patentId}`;
            linkButton.href = nasaLink;
            linkButton.style.display = 'block';
        } else {
            linkButton.style.display = 'none';
        }
    }

    async enableMode(mode) {
        // Clear current globe state
        if (this.earth) this.earth.clearEarth();
        
        // Get containers
        const earthContainer = document.getElementById('earth-container');
        const moonContainer = document.getElementById('moon-container');
        const marsContainer = document.getElementById('mars-container');
        const chatPanel = document.getElementById('chat-panel');
        
        // Hide chat panel by default
        if (chatPanel) chatPanel.style.display = 'none';

        const modeButtons = document.querySelectorAll('.mode-button');
        modeButtons.forEach(button => {
            button.classList.remove('active');
            if (button.id === `${mode}-mode`) {
                button.classList.add('active');
            }
        });
        
        // Handle different modes
        switch(mode) {
            case 'earth':
                if (marsContainer) marsContainer.style.display = 'none';
                if (moonContainer) moonContainer.style.display = 'none';
                if (earthContainer) earthContainer.style.display = 'block';

                // Pause Moon controls if active
                if (this.moon?.controls) {
                    this.moon.controls.autoRotate = false;
                }

                // Pause Mars controls if active
                if (this.mars?.controls) {
                    this.mars.controls.autoRotate = false;
                }

                // Resume Earth controls 
                if (this.earth?.controls) {
                    this.earth.controls.autoRotate = true;
                }
                
                // Re-initialize satellite data
                try {
                    this.earth.enableSatelliteMode(this.handleSatelliteClick);
                    const response = await this.tleApi.searchSatellites();
                    if (response && response.member) {
                        this.earth.updateSatellites(response.member);
                    }
                } catch (error) {
                    console.error('Error fetching satellite data:', error);
                }
                break;

            case 'mars':
                if (earthContainer) earthContainer.style.display = 'none';
                if (moonContainer) moonContainer.style.display = 'none';
                if (marsContainer) marsContainer.style.display = 'block';
                
                // Pause Earth controls
                if (this.earth?.controls) {
                    this.earth.controls.autoRotate = false;
                }

                // Pause Moon controls if active
                if (this.moon?.controls) {
                    this.moon.controls.autoRotate = false;
                }
                
                // Resume Mars controls
                if (this.mars?.controls) {
                    this.mars.controls.autoRotate = true;
                }
                break;

            case 'moon':
                if (earthContainer) earthContainer.style.display = 'none';
                if (marsContainer) marsContainer.style.display = 'none';
                if (moonContainer) moonContainer.style.display = 'block';
                
                // Pause Earth controls
                if (this.earth?.controls) {
                    this.earth.controls.autoRotate = false;
                }

                // Pause Mars controls if active
                if (this.mars?.controls) {
                    this.mars.controls.autoRotate = false;
                }
                
                // Resume Moon controls
                if (this.moon?.controls) {
                    this.moon.controls.autoRotate = true;
                }
                break;
    
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
        
        this.earth.resetSelection();
    }

}

export default App;