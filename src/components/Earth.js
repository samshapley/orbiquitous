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

class EarthVisualization {
    constructor(containerId, onSatelliteClick) {
        this.initializeVisualization(containerId, onSatelliteClick);
    }

    initializeVisualization(containerId, onSatelliteClick) {
        // Initialize scene
        this.scene = new THREE.Scene();
        this.currentMode = 'earth';
        
        // Get container and create visualization container
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container with id '${containerId}' not found.`);
        }
        
        // Find or create the visualization container
        this.vizContainer = document.getElementById('earthViz');
        if (!this.vizContainer) {
            this.vizContainer = document.createElement('div');
            this.vizContainer.id = 'earthViz';
            this.container.appendChild(this.vizContainer);
        }
    
        // Get the container's dimensions
        const width = this.container.clientWidth || window.innerWidth;
        const height = this.container.clientHeight || window.innerHeight;
    
        // Initialize camera
        this.camera = new THREE.PerspectiveCamera(75, width/height, 0.1, 30000);
        this.camera.position.set(0, 0, 30000);
        this.camera.lookAt(0, 0, 0);
    
        // Initialize renderer
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

    
        // Append renderer to the visualization container
        this.vizContainer.appendChild(this.renderer.domElement);

        // Initialize globe
        this.earth = new ThreeGlobe()
            .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg', () => {
                this.initializeClouds();
            })
            .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
            .atmosphereColor('lightskyblue')
            .atmosphereAltitude(0.15)
            .globeMaterial(new THREE.MeshPhongMaterial({
                shininess: 15,
                normalScale: new THREE.Vector2(0.1, 0.1)
            }));

        // Set Earth's axial tilt (23.5 degrees)
        this.earth.rotation.x = THREE.MathUtils.degToRad(23.5);

        // Create a container for the globe to handle rotation
        this.earthContainer = new THREE.Object3D();
        this.earthContainer.add(this.earth);
        
        // Add container to scene instead of globe directly
        this.scene.add(this.earthContainer);

        // Adjust globe size
        this.earth.scale.set(1.2, 1.2, 1.2);

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

        // Add clouds configuration
        this.CLOUDS_ALT = 0.004;
        this.CLOUDS_ROTATION_SPEED = -0.006; // deg/frame

        // Add clouds to the globe
        this.initializeClouds();

        // Add warp drive animation state
        this.isWarping = true;
        this.warpSpeed = 0;
        this.targetCameraZ = 300;

        // Add stars background
        this.addStarsBackground();

        // Start animation
        this.animate();

        // Initialize raycaster and mouse vector
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.initializeRotationControl();

        // Variables to track hovered and selected satellites
        this.hoveredSatellite = null;
        this.selectedSatellite = null;

        // Current mode state
        this.currentMode = 'default';

        // Add event listeners
        window.addEventListener('resize', this.onWindowResize.bind(this));
        this.renderer.domElement.addEventListener('click', this.onClick.bind(this), false);
        this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this), false);

        this.renderer.domElement.style.pointerEvents = 'auto';

    }

    initializeClouds() {
        // Create clouds mesh
        this.clouds = new THREE.Mesh(
            new THREE.SphereGeometry(this.earth.getGlobeRadius() * (1 + this.CLOUDS_ALT), 75, 75),
            new THREE.MeshPhongMaterial({
                transparent: true,
                opacity: 0  // Start completely transparent
            })
        );
    
        // Load clouds texture
        new THREE.TextureLoader().load(
            'https://raw.githubusercontent.com/vasturiano/three-globe/master/example/clouds/clouds.png',
            cloudsTexture => {
                this.clouds.material.map = cloudsTexture;
                this.clouds.material.needsUpdate = true;
                
                // Start fade in animation
                this.cloudsFadeStart = Date.now();
                this.isCloudsLoaded = true;
            }
        );
        
        // Add clouds to the globe container
        this.earthContainer.add(this.clouds);
    }

    clearEarth() {
        // Clear satellites
        if (this.satellitesGroup) {
            while(this.satellitesGroup.children.length) {
                this.satellitesGroup.remove(this.satellitesGroup.children[0]);
            }
            this.earth.remove(this.satellitesGroup);
            this.satellitesGroup = null;
        }
        
        // Reset any mode-specific properties
        this.hoveredSatellite = null;
        this.selectedSatellite = null;
    
        // Remove event listeners
        this.renderer.domElement.removeEventListener('click', this.onClick.bind(this));
        this.renderer.domElement.removeEventListener('mousemove', this.onMouseMove.bind(this));
    }

    // New method to enable satellite mode
    enableSatelliteMode(onSatelliteClick) {
        this.clearEarth();
        this.currentMode = 'satellite';
        this.onSatelliteClick = onSatelliteClick;
        
        this.satellitesGroup = new THREE.Group();
        this.earth.add(this.satellitesGroup);
        
        this.renderer.domElement.style.pointerEvents = 'auto';
    }

    enableDefaultMode() {
        this.clearEarth();
        this.currentMode = 'default';
        // Initialize default mode setup
    }

    initializeRotationControl() {
        const toggleButton = document.getElementById('toggleRotation');
        if (toggleButton) {
            // Set initial icon
            toggleButton.innerHTML = '<i class="fas fa-pause"></i>';
            
            toggleButton.addEventListener('click', () => {
                this.controls.autoRotate = !this.controls.autoRotate;
                this.isGlobeRotating = !this.isGlobeRotating;
                // Update icon based on state
                toggleButton.innerHTML = this.controls.autoRotate ? 
                    '<i class="fas fa-pause"></i>' : 
                    '<i class="fas fa-play"></i>';
            });
        }
        this.isGlobeRotating = true;
    }

    initializeSatelliteVisualization() {
        // Create a satellite object group
        this.satellitesGroup = new THREE.Group();
        
        // Add to the earth object instead of the scene
        this.earth.add(this.satellitesGroup);
        
        console.log('Satellite group initialized:', this.satellitesGroup);
    }
    
    updateSatellites(satelliteData) {
        console.log('Updating satellites with data:', satelliteData);
        this.satellites = satelliteData;
    
        // Clear existing satellites
        while(this.satellitesGroup.children.length) {
            this.satellitesGroup.remove(this.satellitesGroup.children[0]);
        }
    
        // Process satellites and create meshes
        this.satellites.forEach((satellite, index) => {
            try {
                const satrec = twoline2satrec(satellite.line1, satellite.line2);
                const now = new Date();
                const positionAndVelocity = propagate(satrec, now);
                const positionEci = positionAndVelocity.position;
    
                if (positionEci) {
                    const gmst = gstime(now);
                    const positionGd = eciToGeodetic(positionEci, gmst);
    
                    const latitude = degreesLat(positionGd.latitude);
                    const longitude = degreesLong(positionGd.longitude);
                    const altitude = positionGd.height;
    
                    // Create satellite mesh
                    const satelliteMaterial = new THREE.MeshBasicMaterial({
                        color: 0xff0000,
                        transparent: true,
                        opacity: 0.8
                    });
    
                    const satelliteMesh = new THREE.Mesh(
                        new THREE.SphereGeometry(0.7, 8, 8),
                        satelliteMaterial
                    );
    
                    // Position the satellite using the globe's coordinate system
                    const position = this.earth.getCoords(latitude, longitude, (altitude / 6371) * 2);
                    satelliteMesh.position.set(position.x, position.y, position.z);
    
                    // Attach satellite data
                    satelliteMesh.userData = {
                        id: satellite.satelliteId?.toString() || satellite.id?.toString(), // Convert to string and handle both property names
                        name: satellite.name,
                        latitude,
                        longitude,
                        altitude
                    };
    
                    this.satellitesGroup.add(satelliteMesh);
                }
            } catch (error) {
                console.error(`Failed to process satellite ${index}:`, error);
            }
        });
    }


    handleSatelliteClick() {
        if (!this.satellitesGroup) return;
        
        const intersects = this.raycaster.intersectObjects(this.satellitesGroup.children, true);
        
        if (intersects.length > 0) {
            const selectedSatellite = intersects[0].object.userData;
            console.log('Satellite clicked:', selectedSatellite);
            if (this.onSatelliteClick) {
                this.onSatelliteClick(selectedSatellite);
            }
            this.selectSatellite(intersects[0].object);
        }
    }
        
    handleDefaultClick() {
        // Implement default click behavior
        const intersects = this.raycaster.intersectObject(this.earth, true);
        
        if (intersects.length > 0) {
            const lat = intersects[0].point.y;
            const lon = intersects[0].point.x;
            console.log('Earth clicked at position:', { lat, lon });
            // Implement any default click behavior
        }
    }

    onClick(event) {
        // Get mouse position in normalized device coordinates (-1 to +1)
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = - ((event.clientY - rect.top) / rect.height) * 2 + 1;
    
        // Update the picking ray with the camera and mouse position
        this.raycaster.setFromCamera(this.mouse, this.camera);
    
        // Check for intersections with satellites
        if (this.satellitesGroup) {
            const intersects = this.raycaster.intersectObjects(this.satellitesGroup.children, true);
            if (intersects.length > 0) {
                const selectedSatellite = intersects[0].object.userData;
                console.log('Satellite clicked:', selectedSatellite);
                if (this.onSatelliteClick) {
                    this.onSatelliteClick(selectedSatellite);
                }
                this.selectSatellite(intersects[0].object);
            }
        }
    }

    onMouseMove(event) {
        // Get mouse position in normalized device coordinates (-1 to +1)
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = - ((event.clientY - rect.top) / rect.height) * 2 + 1;
    
        // Update the picking ray with the camera and mouse position
        this.raycaster.setFromCamera(this.mouse, this.camera);
    
        // Check for intersections with satellites
        if (this.satellitesGroup) {
            const intersects = this.raycaster.intersectObjects(this.satellitesGroup.children, true);
    
            if (intersects.length > 0) {
                const hoveredObject = intersects[0].object;
                if (this.hoveredSatellite !== hoveredObject) {
                    // Reset previous hovered satellite
                    if (this.hoveredSatellite && this.hoveredSatellite !== this.selectedSatellite) {
                        this.hoveredSatellite.material.color.set(0xff0000);
                        this.hoveredSatellite.scale.set(1, 1, 1);
                    }
    
                    // Set new hovered satellite
                    this.hoveredSatellite = hoveredObject;
                    if (this.hoveredSatellite !== this.selectedSatellite) {
                        this.hoveredSatellite.material.color.set(0x66b2ff);
                        this.hoveredSatellite.scale.set(1.3, 1.3, 1.3);
                    }
                }
            } else {
                // Reset previous hovered satellite
                if (this.hoveredSatellite && this.hoveredSatellite !== this.selectedSatellite) {
                    this.hoveredSatellite.material.color.set(0xff0000);
                    this.hoveredSatellite.scale.set(1, 1, 1);
                    this.hoveredSatellite = null;
                }
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

        // Handle clouds fade in
        if (this.isCloudsLoaded && this.clouds.material.opacity < 0.8) {
            const fadeTime = 2000; // 1 second fade duration
            const elapsed = Date.now() - this.cloudsFadeStart;
            const progress = Math.min(elapsed / fadeTime, 1);
            this.clouds.material.opacity = 0.6 * progress;
        }

        // Only rotate if rotation is enabled
        if (this.earthContainer && this.isGlobeRotating) {
            // Apply the same rotation to both the container and clouds
            const rotationSpeed = 0.001;
            this.earthContainer.rotation.y += rotationSpeed;
            
            // Ensure clouds match the earths scale and rotation
            if (this.clouds) {
                this.clouds.scale.copy(this.earth.scale);
                this.clouds.rotation.copy(this.earth.rotation);
            }
        }
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

}

export default EarthVisualization;