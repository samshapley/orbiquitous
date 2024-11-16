// Since THREE is loaded globally via script tag, we can use it directly
class OrbitControlsManager {
    constructor(camera, renderer) {
        if (typeof THREE === 'undefined') {
            throw new Error('THREE is not loaded. Ensure three.js is loaded before OrbitControls.');
        }
        this.controls = new THREE.OrbitControls(camera, renderer.domElement);
        this.setupControls();
    }

    setupControls() {
        this.controls.enableZoom = true;
        this.controls.minDistance = 200;
        this.controls.maxDistance = 500;
        this.controls.enablePan = false;
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
    }

    update() {
        this.controls.update();
    }
}

export default OrbitControlsManager;