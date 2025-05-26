import * as THREE from 'three';

export default class Crowd {
    constructor(renderer, config = {}) {
        this.renderer = renderer;
        this.count    = config.count || 100;
        this.depth    = config.radius || 0.1;
        this.width    = config.radius || 0.2;
        this.height   = config.height || 0.6;
        this.color    = config.color || 0x92CC92;
        this.position = config.position || new THREE.Vector3();
        this.halfSize = new THREE.Vector3(
            this.width / 2, this.depth / 2, this.height / 2
        );
        this.textureSize = Math.ceil(Math.sqrt(this.count));
        this.widthHeight = this.width * this.height;
        this.minPeopleDistance = Math.max(this.width, this.depth) * 3;
        this.repulsionSize = this.minPeopleDistance * 3;

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
    }

    initializePositions(avoidBox=null, maxAttempts=200) {
        const initializeRandomDistance = Math.max(
            30 / Math.sqrt(this.count) * this.minPeopleDistance, 10
        );
        const matrix = new THREE.Matrix4();
        for (let i = 0; i < this.count; i++) {
            let attempts = 0;
            let pos;
            let isValid = false;

            while (attempts < maxAttempts && !isValid) {
                const theta = Math.random() * 2 * Math.PI;
                const radii = Math.random();
                const xx = initializeRandomDistance * radii * Math.cos(theta);
                const yy = initializeRandomDistance * radii * Math.sin(theta);
                const zz = this.height * 0.5 - 0.239;
                pos = new THREE.Vector3(xx, yy, zz).add(this.position);

                isValid = true;
                if (avoidBox && avoidBox.containsPoint(pos)) {
                    isValid = false;
                    continue;
                }
                for (let j = 0; j < i; j++) {
                    if (pos.distanceTo(this.positions[j]) < this.minPeopleDistance) {
                        isValid = false;
                        break;
                    }
                }

                attempts++;
            }
            this.positions[i]  = pos;

            if (!isValid) {
                console.warn(`Could not find non-colliding position after ${maxAttempts} attempts`);
            }

            const vx = 0.5*(Math.random() - 0.5);
            const vy = 0.5*(Math.random() - 0.5);
            this.velocities[i] = new THREE.Vector3(vx, vy, -1);
        }
        this.update();
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

    getAnisotropicDistance(dr) {
        return this.widthHeight * Math.sqrt(
            (dr.x / this.depth)**2 + 
            (dr.y / this.width)**2 + dr.z**2
        );
    }

    getRepulsionFromOthers(i, pos) {
        const force = new THREE.Vector3();
        const dr = new THREE.Vector3();
        const h = this.repulsionSize;
        for (let j = 0; j < this.count; j++) {
            if (i === j) continue;
            dr.copy(pos).sub(this.positions[j]);
            // const r = dr.length();
            const r = this.getAnisotropicDistance(dr);
            if (r > 1e-3 && r < h) {
                force.add(dr.normalize().multiplyScalar(
                    this.sphKernel(r*r, h)
                ));
            }
        }
        force.z = 0.0;
        return force;
    }


    update(callback=()=>{}) {
        const matrix = new THREE.Matrix4();
        const quaternion = new THREE.Quaternion();
        const euler = new THREE.Euler();
        const up = new THREE.Vector3(0, 0, 1);
        const Half_PI = Math.PI*0.5

        for (let i = 0; i < this.count; i++) {
            const pos = this.positions[i];
            const vel = this.velocities[i];
            const box = this.getPersonBox(pos);
            callback(pos, vel, box, i);
            
            matrix.identity();
            const vx = vel.x;
            const vy = vel.y;
            if (vx*vx + vy*vy > 1e-6) {
                euler.set(0, 0, Half_PI - Math.atan2(vy, vx));
                quaternion.setFromEuler(euler);
                matrix.makeRotationFromQuaternion(quaternion);
            }

            matrix.setPosition(pos);
            this.mesh.setMatrixAt(i, matrix);
        }
        this.mesh.instanceMatrix.needsUpdate = true;
    }
}
