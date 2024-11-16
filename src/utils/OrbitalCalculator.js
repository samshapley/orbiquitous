class OrbitalCalculator {
    constructor() {
        this.GM = 398600.4418; // Earth's gravitational parameter (km^3/s^2)
        this.earthRadius = 6371; // Earth's radius in km
    }

    calculatePosition(satellite, time) {
        const { semiMajorAxis, eccentricity, inclination, rightAscension, argumentOfPerigee, meanAnomaly } = satellite.orbit;
        
        // Calculate mean motion
        const n = Math.sqrt(this.GM / Math.pow(semiMajorAxis, 3));
        
        // Calculate mean anomaly at given time
        const M = (n * time + meanAnomaly) % (2 * Math.PI);
        
        // Solve Kepler's equation
        const E = this.solveKepler(M, eccentricity);
        
        // Calculate position in orbital plane
        const pos = this.calculateOrbitalPosition(E, semiMajorAxis, eccentricity);
        
        // Apply rotations
        const eci = this.applyRotations(pos, inclination, rightAscension, argumentOfPerigee);
        
        // Convert to lat/long/altitude
        return this.convertToLatLongAlt(eci);
    }

    solveKepler(M, e) {
        let E = M;
        for (let i = 0; i < 10; i++) {
            E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
        }
        return E;
    }

    calculateOrbitalPosition(E, a, e) {
        return {
            x: a * (Math.cos(E) - e),
            y: a * Math.sqrt(1 - e * e) * Math.sin(E)
        };
    }

    applyRotations(pos, i, Ω, ω) {
        const cosΩ = Math.cos(Ω);
        const sinΩ = Math.sin(Ω);
        const cosI = Math.cos(i);
        const sinI = Math.sin(i);
        const cosω = Math.cos(ω);
        const sinω = Math.sin(ω);

        return {
            x: (cosΩ * cosω - sinΩ * sinω * cosI) * pos.x + (-cosΩ * sinω - sinΩ * cosω * cosI) * pos.y,
            y: (sinΩ * cosω + cosΩ * sinω * cosI) * pos.x + (-sinΩ * sinω + cosΩ * cosω * cosI) * pos.y,
            z: (sinω * sinI) * pos.x + (cosω * sinI) * pos.y
        };
    }

    convertToLatLongAlt(pos) {
        const r = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
        return {
            lat: Math.asin(pos.z / r) * 180 / Math.PI,
            lng: Math.atan2(pos.y, pos.x) * 180 / Math.PI,
            altitude: (r - this.earthRadius) / this.earthRadius
        };
    }
}

export default OrbitalCalculator;