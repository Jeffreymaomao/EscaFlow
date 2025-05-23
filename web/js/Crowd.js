import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';

export default class Crowd {
    constructor(renderer, config = {}) {
        this.renderer = renderer;
        this.count    = config.count || 100;
        this.depth    = config.radius || 0.1;
        this.width    = config.radius || 0.2;
        this.height   = config.height || 0.5;
        this.color    = config.color || 0x003399;
        this.position = config.position || new THREE.Vector3();
        this.halfSize = new THREE.Vector3(
            this.width / 2, this.depth / 2, this.height / 2
        );
        this.textureSize = Math.ceil(Math.sqrt(this.count));

        this.geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        this.geometry.rotateX(Math.PI / 2);
        this.material = new THREE.MeshStandardMaterial({
            color: this.color,
            roughness: 0.9,
            metalness: 0.0
        });

        this.mesh = new THREE.InstancedMesh(this.geometry, this.material, this.count);
        this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.positions = Array(this.count).fill(null).map(() => new THREE.Vector3());
        this.readbackBuffer = new Float32Array(this.textureSize * this.textureSize * 4);
        this.initGPUCompute();

        const matrix = new THREE.Matrix4();
        for (let i = 0; i < this.count; i++) {
            const x = 3*(Math.random() - 0.5);
            const y = 3*(Math.random() - 0.5);
            const z = this.height*0.5 - 0.239;

            const pos = new THREE.Vector3(x, y, z).add(this.position);
            this.positions.push(pos);

            matrix.setPosition(pos);
            this.mesh.setMatrixAt(i, matrix);
        }

        this.mesh.instanceMatrix.needsUpdate = true;
    }

    initGPUCompute() {
        this.gpuCompute = new GPUComputationRenderer(this.textureSize, this.textureSize, this.renderer);

        const posTexture = this.gpuCompute.createTexture();
        const data = posTexture.image.data;
        for (let i = 0; i < this.count; i++) {
            const x = (Math.random() - 0.5) * 3;
            const y = (Math.random() - 0.5) * 3;
            const z = this.height * 0.5 - 0.239;
            const index = i * 4;
            data[index + 0] = x;
            data[index + 1] = y;
            data[index + 2] = z;
            data[index + 3] = 1;
        }

        const fragmentShader = `
            uniform float deltaTime;
            uniform float repulsionStrength;
            uniform float minDist;
            uniform float size;
            // uniform sampler2D positionTexture;

            void main() {
                vec2 uv = gl_FragCoord.xy / resolution.xy;
                vec3 selfPos = texture2D(positionTexture, uv).xyz;
                vec3 force = vec3(0.0);
                float particleCount = float(${this.count});

                for (float y = 0.0; y < size; y++) {
                    for (float x = 0.0; x < size; x++) {
                        float id = gl_FragCoord.y * resolution.x + gl_FragCoord.x;
                        if (id >= float(particleCount)) discard;
                        vec2 offset = vec2(x + 0.5, y + 0.5) / size;
                        vec3 otherPos = texture2D(positionTexture, offset).xyz;
                        vec3 d = selfPos - otherPos;
                        float dist = length(d);
                        if (dist > 0.0 && dist < minDist) {
                            force += normalize(d) * repulsionStrength / (dist * dist);
                        }
                    }
                }

                selfPos += force * deltaTime;
                gl_FragColor = vec4(selfPos, 1.0);
            }
        `;

        this.posVar = this.gpuCompute.addVariable("positionTexture", fragmentShader, posTexture);
        this.gpuCompute.setVariableDependencies(this.posVar, [this.posVar]);
        this.posVar.material.uniforms.deltaTime = { value: 0.016 };
        this.posVar.material.uniforms.repulsionStrength = { value: 0.03 };
        this.posVar.material.uniforms.minDist = { value: 0.4 };
        this.posVar.material.uniforms.size = { value: this.textureSize };

        const err = this.gpuCompute.init();
        if (err) console.error(err);
    }

    addToScene(scene) {
        scene.add(this.mesh);
    }

    getPersonBox(pos) {
        return new THREE.Box3(
            pos.clone().sub(this.halfSize),
            pos.clone().add(this.halfSize)
        );
    }

    updateInstanceMatrix() {
        for (let i = 0; i < this.count; i++) {
            this.matrix.setPosition(this.positions[i]);
            this.mesh.setMatrixAt(i, this.matrix);
        }
        this.mesh.instanceMatrix.needsUpdate = true;
    }

    GPUcompute() {
        this.gpuCompute.compute();
    }

    syncFromGPU() {
        const tex = this.gpuCompute.getCurrentRenderTarget(this.posVar).texture;
        this.renderer.readRenderTargetPixels(
            this.gpuCompute.getCurrentRenderTarget(this.posVar),
            0, 0, this.textureSize, this.textureSize,
            this.readbackBuffer
        );
        for (let i = 0; i < this.count; i++) {
            const index = i * 4;
            this.positions[i].set(
                this.readbackBuffer[index],
                this.readbackBuffer[index + 1],
                this.readbackBuffer[index + 2]
            );
        }
        // this.updateInstanceMatrix();
    }

    update(callback) {
        const matrix = new THREE.Matrix4();
        for (let i = 0; i < this.count; i++) {
            this.GPUcompute();
            this.syncFromGPU();
            const pos = this.positions[i];
            const box = this.getPersonBox(pos);
            callback(pos, box, i);
            matrix.setPosition(pos);
            this.mesh.setMatrixAt(i, matrix);
        }
        this.mesh.instanceMatrix.needsUpdate = true;
    }
}
