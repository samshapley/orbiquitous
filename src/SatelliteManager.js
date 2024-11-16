import OrbitalCalculator from './utils/OrbitalCalculator.js';

class SatelliteManager {
    constructor(globe) {
        this.globe = globe;
        this.calculator = new OrbitalCalculator();
        this.satellites = [];
    }

    setSatellites(satellites) {
        this.satellites = satellites;
        this.createOrbitPaths();
    }

    updatePositions(time) {
        const positions = this.satellites.map(sat => {
            const pos = this.calculator.calculatePosition(sat, time / 1000);
            return {
                ...pos,
                color: sat.color,
                radius: 0.5
            };
        });
        this.globe.setPoints(positions);
    }

    createOrbitPaths() {
        const paths = this.satellites.map(sat => {
            const points = [];
            for (let i = 0; i < 100; i++) {
                const pos = this.calculator.calculatePosition(sat, i * 600);
                points.push([pos.lng, pos.lat, pos.altitude]);
            }
            return {
                coords: points,
                color: sat.color,
                stroke: 2,
                dashLength: 0.1,
                dashGap: 0.008
            };
        });
        this.globe.setPaths(paths);
    }
}

export default SatelliteManager;