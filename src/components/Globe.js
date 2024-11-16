class GlobeVisualization {
    constructor(containerId) {
        if (typeof Globe === 'undefined') {
            throw new Error('Globe.GL is not loaded. Ensure globe.gl is loaded before GlobeVisualization.');
        }
        
        this.globe = Globe()
            .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
            .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
            .atmosphereColor('lightskyblue')
            .atmosphereAltitude(0.15);

        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container with id '${containerId}' not found.`);
        }

        this.initializeGlobe();
    }

    initializeGlobe() {
        // Add Globe to the DOM
        this.globe(this.container);
        
        // Set initial point of view
        this.globe.pointOfView({ lat: 0, lng: 0, altitude: 2.5 });

        // Handle window resize
        window.addEventListener('resize', () => {
            const { innerWidth, innerHeight } = window;
            this.globe.width(innerWidth);
            this.globe.height(innerHeight);
        });

        // Trigger initial resize
        this.globe.width(window.innerWidth);
        this.globe.height(window.innerHeight);
    }

    setPoints(points) {
        this.globe
            .pointsData(points)
            .pointColor('color')
            .pointAltitude('altitude')
            .pointRadius('radius');
    }

    setPaths(paths) {
        this.globe
            .pathsData(paths)
            .pathColor('color')
            .pathStroke('stroke')
            .pathPointAlt('altitude')
            .pathDashLength('dashLength')
            .pathDashGap('dashGap');
    }

    render() {
        this.globe.render();
    }
}

export default GlobeVisualization;