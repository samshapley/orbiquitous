import App from './src/App.js';

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    
    // Handle navigation
    const handleNavigation = (path) => {
        const globeViz = document.getElementById('globeViz');
        const learnContent = document.getElementById('learn-content');
        const aboutContent = document.getElementById('about-content');
        const navLinks = document.querySelectorAll('nav a');
        
        // Remove active class from all links
        navLinks.forEach(link => link.classList.remove('active'));
        
        // Hide all content first
        globeViz.style.display = 'none';
        learnContent.style.display = 'none';
        aboutContent.style.display = 'none';
        
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
                globeViz.style.display = 'block';
                document.querySelector('[data-page="home"]').classList.add('active');
                app.initialize()
                break;

            default:
                globeViz.style.display = 'block';
                document.querySelector('[data-page="home"]').classList.add('active');
                app.initialize();
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