import * as THREE from 'three';

export default class Crowd {
    constructor(renderer, config = {}) {
        this.renderer = renderer;
        this.count    = config.count || 100;
        this.depth    = config.radius || 0.1;
        this.width    = config.radius || 0.2;
        this.height   = config.height || 0.5;
        this.color    = config.color || 0x92CC92;
        this.position = config.position || new THREE.Vector3();
        this.halfSize = new THREE.Vector3(
            this.width / 2, this.depth / 2, this.height / 2
        );
        this.textureSize = Math.ceil(Math.sqrt(this.count));
        this.repulsionSize = Math.max(this.width, this.depth) * 3;

        this.geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
        this.geometry.rotateX(Math.PI / 2);
        this.material = new THREE.MeshStandardMaterial({
            color: this.color,
            roughness: 0.9,
            metalness: 0.0
        });

        this.mesh = new THREE.InstancedMesh(this.geometry, this.material, this.count);
        this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.positions  = new Array(this.count).fill(null);
        this.velocities = new Array(this.count).fill(null);

        const matrix = new THREE.Matrix4();
        for (let i = 0; i < this.count; i++) {
            const x = 3*(Math.random() - 0.5);
            const y = 3*(Math.random() - 0.5);
            const z = this.height*0.5 - 0.239;

            const pos = new THREE.Vector3(x, y, z).add(this.position);
            this.positions[i] = pos;
            this.velocities[i] = new THREE.Vector3(0, 0, 0);

            matrix.setPosition(pos);
            this.mesh.setMatrixAt(i, matrix);
        }

        this.mesh.instanceMatrix.needsUpdate = true;
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

    sphKernel(r, h) {
        const q = r / h;
        if (q < 0) return 0;
        if (q <= 0.5) {
            return 1 - 6*q*q + 6*q*q*q;
        } else if (q <= 1.0) {
            return 2 * Math.pow(1 - q, 3);
        }
        return 0;
    }

    getRepulsionFromOthers(i, pos) {
        const force = new THREE.Vector3();
        const h = this.repulsionSize;
        for (let j = 0; j < this.count; j++) {
            if (i === j) continue;
            const dr = pos.clone().sub(this.positions[j]);
            const r = dr.length();
            if (r > 1e-3 && r < h) {
                const weight = this.sphKernel(r*r, h);
                force.add(dr.normalize().multiplyScalar(weight));
            }
        }
        force.z = 0.0;
        return force;
    }


    update(callback) {
        const matrix = new THREE.Matrix4();
        for (let i = 0; i < this.count; i++) {
            const pos = this.positions[i];
            const vel = this.velocities[i];
            const box = this.getPersonBox(pos);
            callback(pos, vel, box, i);
            matrix.setPosition(pos);
            this.mesh.setMatrixAt(i, matrix);
        }
        this.mesh.instanceMatrix.needsUpdate = true;
    }
}
