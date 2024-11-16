import App from './src/App.js';

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    
    // Handle navigation
    const handleNavigation = (path) => {
        const globeContainer = document.getElementById('globe-container');
        const learnContent = document.getElementById('learn-content');
        const aboutContent = document.getElementById('about-content');
        const navLinks = document.querySelectorAll('nav a');
        const satelliteInfo = document.getElementById('satelliteInfo');

        // Remove active class from all links
        navLinks.forEach(link => link.classList.remove('active'));
        
        // Hide all content first
        globeContainer.style.display = 'none';
        learnContent.style.display = 'none';
        aboutContent.style.display = 'none';
        if (satelliteInfo) {
            satelliteInfo.style.display = 'none'; // Ensure info container is hidden on navigation
        }
        
        // Show appropriate content based on path
        switch(path) {
            case '/learn':
                learnContent.style.display = 'block';
                document.querySelector('[data-page="learn"]').classList.add('active');
                break;
            case '/about':
                aboutContent.style.display = 'block';
                document.querySelector('[data-page="about"]').classList.add('active');
                break;
            case '/':
            case '':
                globeContainer.style.display = 'block';
                document.querySelector('[data-page="home"]').classList.add('active');
                break;

            default:
                globeContainer.style.display = 'block';
                document.querySelector('[data-page="home"]').classList.add('active');
                break;
        }
    };
    
    // Handle initial page load
    handleNavigation(window.location.pathname);

    // Add click event listeners to navigation links
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const path = link.getAttribute('href');
            window.history.pushState({}, '', path);
            handleNavigation(path);
        });
    });

    // Handle browser back/forward buttons
    window.addEventListener('popstate', () => {
        handleNavigation(window.location.pathname);
    });
});