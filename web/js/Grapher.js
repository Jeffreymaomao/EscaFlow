import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

import Stats from './Stats.js';

class Grapher {
    constructor(config={
        stats: false,
        gui:false,
        isShowAxis: true,
        cameraMinDistance: 1,
        cameraMaxDistance: 10,
        backgroundColor: 0xffffff,
        backgroundImage: null,
    }) {
        this.scene = new THREE.Scene();
        this.axisLength = config.axisLength || 1;
        this.axisLabels = [undefined, undefined, undefined];
        this.backgroundColor = config.backgroundColor;
        this.isShowAxis = config.isShowAxis !== undefined ? config.isShowAxis : true;

        this.cameraMinDistance  = config.cameraMinDistance || 1;
        this.cameraMaxDistance  = config.cameraMaxDistance || 10;
        this.initCameraPosition = config.cameraPosition || new THREE.Vector3(1.8, 1.8, 1.8);
        this.isSaveCameraState  = config.isSaveCameraState!==undefined ? config.isSaveCameraState : true;

        if(config.gui) {
            var guiWidth = 245;
            if(config.guiWidth) guiWidth = config.guiWidth;
            this.gui = new dat.GUI({autoPlace: false, width: guiWidth});
            this.gui.domElement.id = 'gui';
            document.querySelector('header').appendChild(this.gui.domElement);
        }

        if(config.stats) {
            this.stats = new Stats();
            this.stats.domElement.id = 'stats';
            document.querySelector('header').appendChild(this.stats.domElement);
        }

        this.initRenderer();
        window.addEventListener('load', () => {
            this.init();
        });
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
        });

        if (config.backgroundImage) {
            const loader = new RGBELoader();
            loader.load(config.backgroundImage, (texture) => {
                texture.mapping = THREE.EquirectangularReflectionMapping;
                this.scene.environment = texture;

                const geometry = new THREE.SphereGeometry(500, 60, 40);
                const material = new THREE.MeshBasicMaterial({
                    map: texture,
                    side: THREE.BackSide,
                    toneMapped: false
                });
                this.skyMesh = new THREE.Mesh(geometry, material);
                this.scene.add(this.skyMesh);
                this.skyMesh.rotation.x = Math.PI/2;
            });
        }
    }

    init() {
        this.initLight();
        this.initCamera(this.initCameraPosition);
        this.initAxis();
        this.initControls();
        this.initAnimation();

        this.loadCameraState(this.camera, this.controls);
        window.addEventListener('beforeunload', this.saveCameraState.bind(this));
    }

    initRenderer() {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('webgl2');
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            context: context,
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
        });
        this.renderer.setClearColor(new THREE.Color(this.backgroundColor), 1);
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        this.renderer.useLegacyLights = false;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        document.body.appendChild(this.renderer.domElement);
    }

    initCamera(position, target=new THREE.Vector3(0, 0, 0)) {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.camera.position.set(position.x, position.y, position.z);
        this.camera.up.set(0, 0, 1);
        this.camera.lookAt(target.x, target.y, target.z);
    }

    initLight() {
        const DL1 = new THREE.DirectionalLight(0xffffff, 4.0);
        DL1.position.set(-1, 1, 1);
        DL1.target.position.set(0, 0, 0);
        DL1.castShadow = true;
        this.scene.add(DL1);

        const DL2 = new THREE.DirectionalLight(0xffffff, 4.0);
        DL2.position.set(1, -0.2, 1);
        DL2.target.position.set(0, 0, 0);
        DL2.castShadow = true;
        this.scene.add(DL2);
        
        const ambient = new THREE.AmbientLight(0xffffff, 0.1);
        this.scene.add(ambient);
    }

    initLabel() {
        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0px';
        this.labelRenderer.domElement.style.pointerEvents = 'none';
        document.body.appendChild(this.labelRenderer.domElement);
    }

    createLabel(text, position, config={}) {
        const div = document.createElement('div');
        div.className = 'label';
        if(config.class) div.classList.add(config.class);
        if(config.class instanceof Array) config.class.forEach(c=>div.classList.add(c));
        div.style.color = config.color || 'white';
        if(katex){
            katex.render(text, div, {
                displayMode: true,
                output: this.katexOutput,
                throwOnError: true,
                trust: true
            });
        } else {
            div.textContent = text;
        }
        const label = new CSS2DObject(div);
        label.position.copy(position);
        this.scene.add(label);
        return label;
    }

    toggleAxis() {
        this.isShowAxis = !this.isShowAxis;
        if (this.isShowAxis) {
            this.showAxis();
        } else {
            this.hideAxis();
        }
    }

    showAxis() {
        this.axesHelper.visible = true;
        this.axisLabels.forEach(label => {
            label.visible = true;
        });
    }

    hideAxis() {
        this.axesHelper.visible = false;
        this.axisLabels.forEach(label => {
            label.visible = false;
        });
    }

    initControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = this.cameraMinDistance;
        this.controls.maxDistance = this.cameraMaxDistance;
    }

    initAxis() {
        this.axesHelper = new THREE.AxesHelper(this.axisLength);
        this.scene.add(this.axesHelper);
        this.axisLabels[0] = this.createLabel("x", new THREE.Vector3(this.axisLength, 0.0, 0.0), {class:'axis'});
        this.axisLabels[1] = this.createLabel("y", new THREE.Vector3(0.0, this.axisLength, 0.0), {class:'axis'});
        this.axisLabels[2] = this.createLabel("z", new THREE.Vector3(0.0, 0.0, this.axisLength), {class:'axis'});
        this.initLabel();
        if (!this.isShowAxis) this.hideAxis();
    }

    saveCameraState() {
        const state = {
            position: {x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z,},
            target:   {x: this.controls.target.x, y: this.controls.target.y, z: this.controls.target.z,},
        };
        if (!this.isSaveCameraState) {
            state.target.x = 0; state.target.y = 0;
        }
        window.localStorage.setItem('cameraState', JSON.stringify(state));
    }

    loadCameraState(camera, controls) {
        const stateStr = localStorage.getItem('cameraState');
        if (!stateStr) return;
        const state = JSON.parse(stateStr);
        camera.position.set(state.position.x, state.position.y, state.position.z);
        controls.target.set(state.target.x, state.target.y, state.target.z);
        controls.update();
    }

    animate() {
        // This is for custom animations.
    }

    initAnimation() {
        const animate = ()=>{
            requestAnimationFrame(animate);
            this.animate();
            this.controls.update();
            this.renderer.render(this.scene, this.camera);
            this.labelRenderer.render(this.scene, this.camera);
            this.stats && this.stats.update();
        }
        animate();
    }
}

Grapher.prototype.addBoxEdge = function(size, config={}) {
    const boxLine = new THREE.LineSegments(
        new THREE.EdgesGeometry(
            new THREE.BoxGeometry(size, size, size)
        ),
        new THREE.LineBasicMaterial({
            color: config.color || 0xffffff
        })
    );

    this.scene.add(boxLine);
    return boxLine;
};

Grapher.prototype.addLine = function(pos_i, pos_f, config={}) {
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(pos_i[0], pos_i[1], pos_i[2]),
        new THREE.Vector3(pos_f[0], pos_f[1], pos_f[2])
    ]);

    const lineMaterial = new THREE.LineBasicMaterial({
        color: config.color || 0xffffff,
        linewidth: config.linewidth || 1
    });

    const line = new THREE.Line(lineGeometry, lineMaterial);
    this.scene.add(line);
    return line;
};

Grapher.prototype.disposeObject = function(object) {
    if (!object) return;
    if (this.scene && object.parent === this.scene) {
        this.scene.remove(object);
    }
    if (object.element && object.element.parentNode) {
        object.element.parentNode.removeChild(object.element);
        object.element = null;
    }
    object.traverse((child) => {
        if (child.geometry) child.geometry.dispose?.();
        if (child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach(mat => mat.dispose?.());
            } else {
                child.material.dispose?.();
            }
        }
    });
};


export default Grapher;