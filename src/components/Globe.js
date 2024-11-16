import ThreeGlobe from 'three-globe';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

class GlobeVisualization {
    constructor(containerId) {
        // Initialize scene
        this.scene = new THREE.Scene();
        
        // Initialize camera with far starting position
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 30000);
        this.camera.position.set(0, 0, 30000);
        this.camera.lookAt(0, 0, 0);

        // Initialize renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Get container and append renderer
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container with id '${containerId}' not found.`);
        }
        this.container.appendChild(this.renderer.domElement);

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

        // Add globe to scene
        this.scene.add(this.globe);

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

        // Handle window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
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

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
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

        // Rotate the container instead of the globe directly
        if (this.globeContainer) {
            this.globeContainer.rotation.y += 0.001;
        }
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

export default GlobeVisualization;