import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

class Grapher {
    constructor(config={
        stats: false,
        gui:false,
        cameraMinDistance: 1,
        cameraMaxDistance: 10,
        backgroundColor: 0xffffff,
        backgroundImage: null,
    }) {
        this.scene = new THREE.Scene();
        this.axisLength = config.axisLength || 1;
        this.axisLabels = [undefined, undefined, undefined];
        this.backgroundColor = config.backgroundColor;

        this.cameraMinDistance  = config.cameraMinDistance || 1;
        this.cameraMaxDistance  = config.cameraMaxDistance || 10;
        this.initCameraPosition = config.cameraPosition || new THREE.Vector3(1.8, 1.8, 1.8);

        if(config.gui) {
            var guiWidth = 245;
            if(config.guiWidth) guiWidth =config.guiWidth
            this.gui = new dat.GUI({ autoPlace: false, width: guiWidth})
            this.gui.domElement.id = 'gui';
            document.querySelector('header').appendChild(this.gui.domElement);
        }

        if(config.stats) {
            this.stats = Stats();
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
        this.initCamera();
        this.initAxis();
        this.initControls();
        this.initAnimation();

        this.loadCameraState(this.camera, this.controls);
        window.addEventListener('beforeunload', function(){
            this.saveCameraState(this.camera, this.controls);
        }.bind(this));
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

    initCamera() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.camera.position.set(this.initCameraPosition.x, this.initCameraPosition.y, this.initCameraPosition.z);
        this.camera.up.set(0, 0, 1);
        this.camera.lookAt(0, 0, 0);
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
        this.initLabel();
        this.axisLabels[0] = this.createLabel("x", new THREE.Vector3(this.axisLength, 0.0, 0.0), {class:'axis'});
        this.axisLabels[1] = this.createLabel("y", new THREE.Vector3(0.0, this.axisLength, 0.0), {class:'axis'});
        this.axisLabels[2] = this.createLabel("z", new THREE.Vector3(0.0, 0.0, this.axisLength), {class:'axis'});
    }

    createLabel(text, position, config={}) {
        const div = document.createElement('div');
        div.className = 'label';
        if(config.class) div.classList.add(config.class);
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

    saveCameraState (camera, controls) {
        const state = {
            position: {x: camera.position.x, y: camera.position.y, z: camera.position.z,},
            target:   {x: controls.target.x, y: controls.target.y, z: controls.target.z,},
        };
        state.target.x = 0; state.target.y = 0;
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

export default Grapher;