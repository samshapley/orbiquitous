import ThreeGlobe from 'three-globe';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
    twoline2satrec, 
    propagate, 
    gstime, 
    eciToGeodetic, 
    degreesLat, 
    degreesLong 
} from 'satellite.js';

class GlobeVisualization {
    constructor(containerId, onSatelliteClick) {
        // Initialize scene
        this.scene = new THREE.Scene();
        
        // Get container and create visualization container
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container with id '${containerId}' not found.`);
        }
        
        // Find or create the visualization container
        this.vizContainer = document.getElementById('globeViz');
        if (!this.vizContainer) {
            this.vizContainer = document.createElement('div');
            this.vizContainer.id = 'globeViz';
            this.container.appendChild(this.vizContainer);
        }
    
        // Get the container's dimensions
        const width = this.container.clientWidth || window.innerWidth;
        const height = this.container.clientHeight || window.innerHeight;
    
        // Initialize camera (only once)
        this.camera = new THREE.PerspectiveCamera(75, width/height, 0.1, 30000);
        this.camera.position.set(0, 0, 30000);
        this.camera.lookAt(0, 0, 0);
    
        // Initialize renderer (only once)
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(width, height);
    
        // Ensure the canvas fills its container
        this.renderer.domElement.style.width = '100%';
        this.renderer.domElement.style.height = '100%';
        this.renderer.domElement.style.position = 'absolute';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.left = '0';
        this.renderer.domElement.style.zIndex = '1';
        this.renderer.domElement.style.pointerEvents = 'auto';
    
        // Append renderer to the visualization container
        this.vizContainer.appendChild(this.renderer.domElement);

        // Initialize globe
        this.globe = new ThreeGlobe()
            .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
            .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
            .atmosphereColor('lightskyblue')
            .atmosphereAltitude(0.15)
            .globeMaterial(new THREE.MeshPhongMaterial({
                shininess: 15,
                normalScale: new THREE.Vector2(0.1, 0.1)
            }));

        // Set Earth's axial tilt (23.5 degrees)
        this.globe.rotation.x = THREE.MathUtils.degToRad(23.5);

        // Create a container for the globe to handle rotation
        this.globeContainer = new THREE.Object3D();
        this.globeContainer.add(this.globe);
        
        // Add container to scene instead of globe directly
        this.scene.add(this.globeContainer);

        // Adjust globe size
        this.globe.scale.set(1.2, 1.2, 1.2);

        // Enhanced lighting
        const ambientLight = new THREE.AmbientLight(0xcccccc, 0.8);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(100, 10, 100);
        
        // Add subtle blue point light on the opposite side
        const backLight = new THREE.PointLight(0x2d4ea3, 1);
        backLight.position.set(-100, 0, -100);
        
        this.scene.add(ambientLight);
        this.scene.add(directionalLight);
        this.scene.add(backLight);

        // Enhanced controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableZoom = true;
        this.controls.minDistance = 200;
        this.controls.maxDistance = 800;
        this.controls.enablePan = false;
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.rotateSpeed = 0.3;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.5;

        // Add warp drive animation state
        this.isWarping = true;
        this.warpSpeed = 0;
        this.targetCameraZ = 300;

        // Add stars background
        this.addStarsBackground();

        // Start animation
        this.animate();

        this.satellites = [];
        
        // Add method call after globe initialization
        this.initializeSatelliteVisualization();

        // Store the callback for satellite clicks
        this.onSatelliteClick = onSatelliteClick;

        // Initialize raycaster and mouse vector
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.initializeRotationControl();

        // Variables to track hovered and selected satellites
        this.hoveredSatellite = null;
        this.selectedSatellite = null;

        // Add event listeners
        window.addEventListener('resize', this.onWindowResize.bind(this));
        this.renderer.domElement.addEventListener('click', this.onClick.bind(this), false);
        this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this), false);

    }

    initializeRotationControl() {
        const toggleButton = document.getElementById('toggleRotation');
        if (toggleButton) {
            toggleButton.addEventListener('click', () => {
                // Toggle both the controls auto-rotation and the manual rotation
                this.controls.autoRotate = !this.controls.autoRotate;
                this.isGlobeRotating = !this.isGlobeRotating; // Add this new property
                toggleButton.textContent = this.controls.autoRotate ? 'Stop Rotation' : 'Start Rotation';
            });
        }
        // Initialize the rotation state
        this.isGlobeRotating = true;
    }

    initializeSatelliteVisualization() {
        // Create a satellite object group
        this.satellitesGroup = new THREE.Group();
        // Add the group directly to the scene, not the globe
        this.scene.add(this.satellitesGroup);
        
        // Debug log
        console.log('Satellite group initialized:', this.satellitesGroup);
    }

    updateSatellites(satelliteData) {
        console.log('Updating satellites with data:', satelliteData);
        this.satellites = satelliteData;

        // Clear existing satellites
        while(this.satellitesGroup.children.length) {
            this.satellitesGroup.remove(this.satellitesGroup.children[0]);
        }

        console.log('Cleared existing satellites:', this.satellitesGroup.children);

        // Current time
        const now = new Date();

        // Parse TLE data and compute positions
        const processedSatellites = this.satellites.map((satellite, index) => {
            try {
                const tleLine1 = satellite.line1;
                const tleLine2 = satellite.line2;

                // Generate a satellite record
                const satrec = twoline2satrec(tleLine1, tleLine2);

                // Get position and velocity vectors
                const positionAndVelocity = propagate(satrec, now);
                const positionEci = positionAndVelocity.position;

                if (positionEci) {
                    // Convert ECI to geodetic coordinates (latitude, longitude, altitude)
                    const gmst = gstime(now);
                    const positionGd = eciToGeodetic(positionEci, gmst);

                    const latitude = degreesLat(positionGd.latitude);
                    const longitude = degreesLong(positionGd.longitude);
                    const altitude = positionGd.height;

                    console.log(`Satellite ${index} position:`, { latitude, longitude, altitude });

                    return {
                        id: satellite.satelliteId,
                        name: satellite.name,
                        latitude,
                        longitude,
                        altitude
                    };
                } else {
                    console.warn(`No position data for satellite ${index}`);
                    return null;
                }
            } catch (error) {
                console.error(`Failed to process satellite ${index}:`, error);
                return null;
            }
        }).filter(sat => sat !== null); // Remove null entries

        // Update globe with processed satellite positions
        this.globe
            .objectsData(processedSatellites)
            .objectLat(d => d.latitude)
            .objectLng(d => d.longitude)
            .objectAltitude(d => d.altitude / 6371) // Normalize altitude relative to Earth's radius
            .objectThreeObject(d => {
                console.log('Creating satellite mesh for:', d);
                const satelliteMaterial = new THREE.MeshBasicMaterial({
                    color: 0xff0000, // Red color
                    transparent: true,
                    opacity: 0.8 // Adjust opacity for glowing effect
                });

                const satelliteMesh = new THREE.Mesh(
                    new THREE.SphereGeometry(0.7, 8, 8),
                    satelliteMaterial
                );

                // Attach satellite data to mesh for reference on click
                satelliteMesh.userData = d;

                this.satellitesGroup.add(satelliteMesh);

                return satelliteMesh;
            });

        // Add debug log after setting up objects
        console.log('Globe objects after update:', this.globe.objectsData());
    }


    onClick(event) {
        event.preventDefault();
        // Get mouse position in normalized device coordinates (-1 to +1)
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = - ((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Update the picking ray with the camera and mouse position
        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Calculate objects intersecting the picking ray
        const intersects = this.raycaster.intersectObjects(this.satellitesGroup.children, true);

        if (intersects.length > 0) {
            const selectedSatellite = intersects[0].object.userData;
            console.log('Satellite clicked:', selectedSatellite);
            if (this.onSatelliteClick) {
                this.onSatelliteClick(selectedSatellite);
            }

            // Update visual state for selected satellite
            this.selectSatellite(intersects[0].object);
        }
    }

    onMouseMove(event) {
        event.preventDefault();
        // Get mouse position in normalized device coordinates (-1 to +1)
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = - ((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Update the picking ray with the camera and mouse position
        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Calculate objects intersecting the picking ray
        const intersects = this.raycaster.intersectObjects(this.satellitesGroup.children, true);

        if (intersects.length > 0) {
            const hoveredObject = intersects[0].object;
            if (this.hoveredSatellite !== hoveredObject) {
                // Reset previous hovered satellite
                if (this.hoveredSatellite && this.hoveredSatellite !== this.selectedSatellite) {
                    this.hoveredSatellite.material.color.set(0xff0000); // Original color
                    this.hoveredSatellite.scale.set(1, 1, 1); // Original scale
                }

                // Set new hovered satellite
                this.hoveredSatellite = hoveredObject;
                if (this.hoveredSatellite !== this.selectedSatellite) {
                    this.hoveredSatellite.material.color.set(0x66b2ff); // Pale blue
                    this.hoveredSatellite.scale.set(1.3, 1.3, 1.3); // Slightly bigger
                }
            }
        } else {
            // Reset previous hovered satellite
            if (this.hoveredSatellite && this.hoveredSatellite !== this.selectedSatellite) {
                this.hoveredSatellite.material.color.set(0xff0000); // Original color
                this.hoveredSatellite.scale.set(1, 1, 1); // Original scale
                this.hoveredSatellite = null;
            }
        }
    }

    selectSatellite(satelliteMesh) {
        // Reset previous selected satellite
        if (this.selectedSatellite) {
            this.selectedSatellite.material.color.set(0xff0000); // Original color
            this.selectedSatellite.scale.set(1, 1, 1); // Original scale
        }

        // Set new selected satellite
        this.selectedSatellite = satelliteMesh;
        this.selectedSatellite.material.color.set(0x66b2ff); // Pale blue
        this.selectedSatellite.scale.set(1.5, 1.5, 1.5); // Slightly bigger

        // Optional: Reset hoveredSatellite if it's the same as selected
        if (this.hoveredSatellite === this.selectedSatellite) {
            this.hoveredSatellite = null;
        }
    }

    // Optionally, add a method to reset selection
    resetSelection() {
        if (this.selectedSatellite) {
            this.selectedSatellite.material.color.set(0xff0000); // Original color
            this.selectedSatellite.scale.set(1, 1, 1); // Original scale
            this.selectedSatellite = null;
        }
    }

    addStarsBackground() {
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.7,
            transparent: true,
            opacity: 0.1 // Start with low opacity
        });

        const starsVertices = [];
        for (let i = 0; i < 5000; i++) {
            const x = (Math.random() - 0.5) * 2000;
            const y = (Math.random() - 0.5) * 2000;
            const z = (Math.random() - 0.5) * 2000;
            starsVertices.push(x, y, z);
        }

        starsGeometry.setAttribute('position', 
            new THREE.Float32BufferAttribute(starsVertices, 3));
        
        this.starField = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(this.starField);
    }

    // Add this method to handle container sizing
    onWindowResize() {
        const width = this.container.clientWidth || window.innerWidth;
        const height = this.container.clientHeight || window.innerHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        // Handle warp drive effect
        if (this.isWarping) {
            // Accelerate the warp speed
            this.warpSpeed += 0.015;
            
            // Calculate new camera position with exponential deceleration
            const newZ = this.camera.position.z - (Math.pow(this.warpSpeed, 3) * 100);
            
            // Update star field stretching effect
            if (this.starField) {
                this.starField.material.size = Math.min(2, 0.7 + this.warpSpeed * 0.5);
                this.starField.material.opacity = Math.min(1, this.warpSpeed);
            }
            
            // Check if we've reached the target position
            if (newZ <= this.targetCameraZ) {
                this.camera.position.z = this.targetCameraZ;
                this.isWarping = false;
                if (this.starField) {
                    this.starField.material.size = 0.7;
                    this.starField.material.opacity = 1;
                }
            } else {
                this.camera.position.z = newZ;
            }
        }

        // Only rotate the container if rotation is enabled
        if (this.globeContainer && this.isGlobeRotating) {
            this.globeContainer.rotation.y += 0.001;
        }
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

}

export default GlobeVisualization;