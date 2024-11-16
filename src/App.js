import GlobeVisualization from './components/Globe.js';
import SatelliteManager from './SatelliteManager.js';

class App {
    constructor() {
        this.globe = new GlobeVisualization('globeViz');
        this.satelliteManager = new SatelliteManager(this.globe);
    }

    initialize(satelliteData) {
        this.satelliteManager.setSatellites(satelliteData);
        this.startAnimation();
    }

    startAnimation() {
        const animate = (time) => {
            requestAnimationFrame(animate);
            this.satelliteManager.updatePositions(time);
            this.globe.render();
        };
        animate(0);
    }
}

export default App;