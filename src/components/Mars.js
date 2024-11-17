import ThreeGlobe from 'three-globe';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

class MarsVisualization {
    constructor(containerId) {
        // Initialize scene
        this.scene = new THREE.Scene();
        
        // Get container and create visualization container
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container with id '${containerId}' not found.`);
        }
        
        // Find or create the visualization container
        this.vizContainer = document.getElementById('marsViz');
        if (!this.vizContainer) {
            this.vizContainer = document.createElement('div');
            this.vizContainer.id = 'marsViz';
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

        // Initialize Mars globe
        this.globe = new ThreeGlobe()
            .globeImageUrl('/src/assets/lunar_surface.jpg')
            .atmosphereColor('#983232')
            .atmosphereAltitude(0.15)
            .globeMaterial(new THREE.MeshPhongMaterial({
                shininess: 15,
                normalScale: new THREE.Vector2(0.1, 0.1)
            }));

        // Create a container for the globe to handle rotation
        this.earthContainer = new THREE.Object3D();
        this.earthContainer.add(this.globe);
        
        // Add container to scene
        this.scene.add(this.earthContainer);

        // Adjust globe size
        this.globe.scale.set(1.2, 1.2, 1.2);

        // Enhanced lighting
        const ambientLight = new THREE.AmbientLight(0xcccccc, 0.8);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(100, 10, 100);
        
        this.scene.add(ambientLight);
        this.scene.add(directionalLight);

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

        // Add stars background
        this.addStarsBackground();

        // Add warp drive animation state
        this.isWarping = true;
        this.warpSpeed = 0;
        this.targetCameraZ = 300;

        // Start animation
        this.animate();

        // Add event listener for window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    addStarsBackground() {
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.7,
            transparent: true,
            opacity: 0.1
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
            this.warpSpeed += 0.015;
            const newZ = this.camera.position.z - (Math.pow(this.warpSpeed, 3) * 100);
            
            if (this.starField) {
                this.starField.material.size = Math.min(2, 0.7 + this.warpSpeed * 0.5);
                this.starField.material.opacity = Math.min(1, this.warpSpeed);
            }
            
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

        // Handle rotation
        if (this.earthContainer) {
            const rotationSpeed = 0.001;
            this.earthContainer.rotation.y += rotationSpeed;
        }
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

export default MarsVisualization;