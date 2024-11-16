const satelliteData = [
    {
        id: 1,
        name: 'Satellite A',
        orbit: {
            semiMajorAxis: 7000, // km
            eccentricity: 0.1,
            inclination: 45, // degrees
            rightAscension: 0,
            argumentOfPerigee: 0,
            meanAnomaly: 0
        },
        color: '#ff0000'
    },
    {
        id: 2,
        name: 'Satellite B',
        orbit: {
            semiMajorAxis: 8000,
            eccentricity: 0.2,
            inclination: 30,
            rightAscension: 60,
            argumentOfPerigee: 30,
            meanAnomaly: 0
        },
        color: '#00ff00'
    },
    {
        id: 3,
        name: 'Satellite C',
        orbit: {
            semiMajorAxis: 9000,
            eccentricity: 0.3,
            inclination: 60,
            rightAscension: 120,
            argumentOfPerigee: 60,
            meanAnomaly: 0
        },
        color: '#0000ff'
    }
];

export default satelliteData;