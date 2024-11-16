import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';

class OrbitControlsManager {
    constructor(camera, renderer) {
        this.controls = new OrbitControls(camera, renderer.domElement);
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