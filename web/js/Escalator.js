import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export default class Escalator {
    constructor(config={ url: null, position:new THREE.Vector3(), scale:null }) {
        this.url = config.url;
        this.position = config.position;
        this.scale = config.scale || [1.0, 1.0, 1.0];
        this.rotation = config.rotation || [Math.PI/2, 0, 0];
        this.object = null;
        this.size = new THREE.Vector3();
        this.box  = new THREE.Box3();

        this.pad = 2;
        this.count = 15;
        this.dy = 0.226;
        this.dz = 0.128;
        this.x0 =  0.00 + this.position.x;
        this.y0 =  0.49 + this.position.y;
        this.z0 = -0.22 + this.position.z;
        this.dt = 0.01;

        this.ymax = this.count * this.dy + this.y0;
        this.zmax = this.count * this.dz + this.z0;

        this.enteringPoint  = new THREE.Vector3(
            this.x0,
            this.y0 - 3*this.dy,
            this.z0
        );
        this.groundPosition = new THREE.Vector3(0, 0, -0.24).add(this.position);
    }

    load(scene, onLoadCallback = null) {
        const loader = new GLTFLoader();
        loader.load(this.url, (gltf) => {
            this.object = gltf.scene;
            this.object.traverse(this.applyMaterial);

            this.object.position.copy(this.position);
            this.object.scale.set(...this.scale);
            this.object.rotation.set(...this.rotation);

            scene.add(this.object);
            if (onLoadCallback) onLoadCallback(this.object);

            this.box = new THREE.Box3().setFromObject(this.object);
            this.box.getSize(this.size);
            this.updateThisHalfSize()

            this.addStairs(scene);
            this.addGround(scene);

        }, undefined, (error) => {
            console.error('Failed to load GLB:', error);
        });
    }

    updateThisHalfSize() {
        this.halfSize = new THREE.Vector3(
            this.size.x * 0.85 / 2,
            this.dy / 2,
            this.dz / 2
        );
    }

    getStairBox(singleStairPosition) {
        return new THREE.Box3(
            singleStairPosition.clone().sub(this.halfSize),
            singleStairPosition.clone().add(this.halfSize)
        );
    }

    applyMaterial(child) {
        if (!child.isMesh) return;
        if (child.name==='Cube017_1') {
            // glass
            child.material = new THREE.MeshPhysicalMaterial({
                color: 0xe8f6ff,
                transparent: true,
                opacity: 0.5,
                transmission: 0.5,
                roughness: 0.5,
                thickness: 0.1,
                depthWrite: false
            });
            // child.visible = false;
        } else if (child.name==='Cube017') {
            // base
            child.material = new THREE.MeshStandardMaterial({
                color: 0x333333, 
                roughness: 0.1,
                metalness: 0.0
            });
            // child.visible = false;
        } else if (child.name==='Cube017_2') {
            // handle
            child.material = new THREE.MeshStandardMaterial({
                color: 0x111111,
                roughness: 0.0,
                metalness: 0.2
            });
            // child.visible = false;
        }else if (child.name==='Cube017_3') {
            child.visible = false;
        }
    }

    addGround(scene) {
        const floorGeometry = new THREE.PlaneGeometry(4, 4);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.8,
            metalness: 0.2,
            side: THREE.DoubleSide
        });

        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.position.set(...this.groundPosition);
        scene.add(floor);
    }

    addStairs(scene) {
        const width = this.size.x * 0.85;
        const stairMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.8,
            metalness: 0.2
        });
        
        this.stairsPosition = [];
        const stairGeometry = new THREE.BoxGeometry(width, this.dy, this.dz);
        const instancedMesh = new THREE.InstancedMesh(stairGeometry, stairMaterial, this.count+this.pad);
        for (let i = 0; i < this.count+this.pad; i++) {
            const y = i*this.dy + this.y0 - this.dy;
            const z = i*this.dz + this.z0 - this.dz;
            const pos = new THREE.Vector3(this.x0, y, z);
            this.stairsPosition.push(pos.clone())
            const matrix = new THREE.Matrix4();
            matrix.setPosition(pos);
            instancedMesh.setMatrixAt(i, matrix);
        }
        scene.add(instancedMesh);
        this.staisMesh = instancedMesh;

        // --- start stair
        const startStairGeometry = new THREE.BoxGeometry(width, 0.3, 0.05);
        const startStairMesh = new THREE.Mesh(startStairGeometry, stairMaterial);
        startStairMesh.position.set(0, 0.1, -0.26);
        startStairMesh.position.add(this.position);
        scene.add(startStairMesh);

        // --- end stair
        const endStairGeometry = new THREE.BoxGeometry(width, 0.55, 0.08);
        const endStairMesh = new THREE.Mesh(endStairGeometry, stairMaterial);
        endStairMesh.position.set(0, this.size.y - 0.71, this.size.z - 0.8202);
        endStairMesh.position.add(this.position);
        scene.add(endStairMesh);
    }

    update(dt) {
        if(!this.staisMesh || !this.stairsPosition) return;
        for (let i = 0; i < this.count+this.pad; i++) {
            const pos = this.stairsPosition[i];

            const bufferLength = 0.3;
            const distanceToTop = Math.abs(this.zmax - pos.z);
            let dzFactor = 1.0;
            if (distanceToTop < bufferLength) {
                dzFactor = distanceToTop / bufferLength;
                dzFactor = Math.max(dzFactor, 0.05);
            }

            pos.y += this.dt*this.dy;
            pos.z += this.dt*this.dz * dzFactor;

            if (pos.z > this.zmax+this.dz*0.1|| pos.y > this.ymax+this.dy*0.1) {
                pos.y = this.y0 - this.pad*this.dy;
                pos.z = this.z0 - this.pad*this.dz;
            }
            this.stairsPosition[i] = pos;
            const matrix = new THREE.Matrix4();
            matrix.setPosition(pos);
            this.staisMesh.setMatrixAt(i, matrix);
        }
        this.staisMesh.instanceMatrix.needsUpdate = true;
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

    getForceByWall(personPos, personBox) {
        const box = this.box;
        if (personBox.max.y < this.enteringPoint.y) {
            return new THREE.Vector3(0, 0, 0);
        }
        const dr2R = personBox.min.x - box.max.x;
        if (dr2R > 0) {
            const fy = this.sphKernel(dr2R, this.dy);
            return new THREE.Vector3(fy, 0, 0);
        }
        
        const dr2L = box.min.x - personBox.max.x;
        if (dr2L > 0) {
            const fy = this.sphKernel(dr2L, this.dy);
            return new THREE.Vector3(-fy, 0, 0);
        }
        return new THREE.Vector3(0, 0, 0);
    }

    getStairSurfacePointIfCollision(personPos, personBox) {
        if (!this.stairsPosition) return null;
        const porsonHalf = personBox.getSize(new THREE.Vector3()).divideScalar(2);
        for (let stair of this.stairsPosition) {
            const stairBox = this.getStairBox(stair);
            if (stairBox.intersectsBox(personBox)) {

                if (personBox.min.x < stairBox.min.x) {
                    personPos.x = stairBox.min.x - porsonHalf.x - 1e-5;
                } else if (personBox.max.x > stairBox.max.x) {
                    personPos.x = stairBox.max.x + porsonHalf.x + 1e-5;
                }

                return new THREE.Vector3(
                    personPos.x,
                    personPos.y,
                    stairBox.max.z + porsonHalf.z + 1e-5
                );
            }
        }

        // const escaBox = this.box;
        // if (escaBox.intersectsBox(personBox)) {
        //     if (personBox.max.x > escaBox.min.x) {
        //         personPos.x = escaBox.min.x - porsonHalf.x - 1e-5;
        //     } else if (personBox.min.x < escaBox.max.x) {
        //         personPos.x = escaBox.max.x + porsonHalf.x + 1e-5;
        //     }
        // }

        if (personPos.z-porsonHalf.z< this.groundPosition.z) {
            return new THREE.Vector3(
                personPos.x,
                personPos.y,
                this.groundPosition.z+porsonHalf.z + 1e-5
            );
        }
        return null;
    }

}
