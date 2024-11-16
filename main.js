import App from './src/App.js';

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.initialize(satelliteData);
});