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
        this.groundSize = config.groundSize || new THREE.Vector2(1.0, 1.0);

        const guessCount = this.url?.split('-').pop().split('.').shift();
        this.count = config.count || parseInt(guessCount) || 15;
        this.pad = 4;
        this.dy =  0.226;
        this.dz =  0.128;
        this.x0 =  0.00 + this.position.x;
        this.y0 =  0.49 + this.position.y;
        this.z0 = -0.22 + this.position.z;
        this.currentDeltaY = 0.0;

        this.ymax = this.count * this.dy + this.y0;
        this.zmax = this.count * this.dz + this.z0;

        this.enteringPoint = new THREE.Vector3(
            this.x0,
            this.y0 - 5*this.dy,
            this.z0
        );
        this.exitingPoint = new THREE.Vector3(
            this.x0,
            this.y0 + this.dy,
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

            this.box = new THREE.Box3().setFromObject(this.object);
            this.box.getSize(this.size);
            this.updateThisHalfSize()

            this.addStairs(scene);
            this.addGround(scene);
            if (onLoadCallback) onLoadCallback(this.object);
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
        const floorGeometry = new THREE.PlaneGeometry(this.groundSize.x, this.groundSize.y);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.99,
            metalness: 0.1,
            // disable

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
            if (pos.z > this.zmax+this.dz*0.0 || pos.y > this.ymax+this.dy*0.2) {
                const lowestStairPos = this.stairsPosition[
                    (i+1)%this.stairsPosition.length
                ];
                pos.y = lowestStairPos.y - this.dy;
                pos.z = lowestStairPos.z - this.dz;
            }
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

    getVelocity(pos) {
        // This will make the buffer change very fast
        const bufferLength = 0.15; // DO NOT CHANGE THIS
        const distanceToTop = Math.abs(this.zmax - pos.z);
        let dzFactor = 1.0;
        if (distanceToTop < bufferLength) {
            dzFactor = distanceToTop / bufferLength;
            dzFactor = Math.max(dzFactor, 0.05);
        }
        return new THREE.Vector3(0, this.dy, this.dz * dzFactor);
    }

    update(dt) {
        if(!this.staisMesh || !this.stairsPosition) return;
        const matrix = new THREE.Matrix4();
        for (let i = 0; i < this.count+this.pad; i++) {
            const pos = this.stairsPosition[i];
            const vel = this.getVelocity(pos);
            pos.addScaledVector(vel, dt);

            this.currentDeltaY = (this.currentDeltaY + this.dy * dt)%this.dy;

            if (pos.z > this.zmax+this.dz*0.1 || pos.y > this.ymax+this.dy*0.2) {
                const lowestStairPos = this.stairsPosition[
                    (i+1)%this.stairsPosition.length
                ];
                pos.y = lowestStairPos.y - this.dy;
                pos.z = lowestStairPos.z - this.dz;
            }
            this.stairsPosition[i] = pos;
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
        if (personBox.max.y < this.y0 - 3*this.dy) {
            return new THREE.Vector3(0, 0, 0);
        }
        const dr2R = personBox.min.x - box.max.x;
        if (dr2R > 0) {
            const fx = this.sphKernel(dr2R, this.dy * 2.0) * 2.0;
            // const fx = 1.0 / dr2R*dr2R;
            return new THREE.Vector3(fx, 0, 0);
        }
        
        const dr2L = box.min.x - personBox.max.x;
        if (dr2L > 0) {
            const fx = this.sphKernel(dr2L, this.dy * 2.0) * 2.0;
            // const fx = 1.0 / dr2R*dr2R;
            return new THREE.Vector3(-fx, 0, 0);
        }

        if (dr2R < 0.0 &&
            dr2L < 0.0 &&
            personBox.max.y > this.exitingPoint.y
        ) {
            const dz2bottom = Math.abs(this.exitingPoint.max.y - this.y0) * this.dz / this.dy;
            if (dz2bottom * 0.9 < this.dz) {
                return new THREE.Vector3(0, 0, 0);
            }
            // inside the escalator
            const dis2center = 0.8 * (personPos.x - 0.0);
            const fx = Math.sign(dis2center)/(dis2center*dis2center+0.1);
            return new THREE.Vector3(fx, 0, 0);
        }

        if (dr2R < 0.0 &&
            dr2L < 0.0 &&
            personBox.max.y > this.enteringPoint.y
        ) {
            if (personPos.x>0) {
                const fxR = 1/(Math.pow(dr2R/0.2, 6)+1);
                return new THREE.Vector3(-fxR, 0, 0);
            }
            if (personPos.y>0) {
                const fxL = 1/(Math.pow(dr2L/0.2, 6)+1);
                return new THREE.Vector3(fxL, 0, 0);
            }
        }


        return new THREE.Vector3(0, 0, 0);
    }

    getGoUpStairForce(pos) {
        const box = this.box;
        const enter = this.enteringPoint;
        const exit = this.exitingPoint;
        const dr2exit = exit.clone().sub(pos);
        if (pos.x < box.max.x &&
            pos.x > box.min.x &&
            pos.y > enter.y &&
            pos.y < exit.y
        ) { // in side the star
            return dr2exit;
        }
        if (dr2exit.length() < 1.0 * this.dy && pos.z < exit.z) {
            return new THREE.Vector3(0, 0, 0);
        }
        return enter.clone().sub(pos);
    }

    isPersonFinished(personPos) {
        if (
            personPos.z > this.zmax &&
            personPos.y > this.box.max.y
        ) return true;
        return false;
    }

    getStairSurfacePointIfCollision(personPos, personBox, porsonHalf) {
        if (!this.stairsPosition) return null;
        for (let stair of this.stairsPosition) {
            const stairBox = this.getStairBox(stair);
            if (stairBox.intersectsBox(personBox)) {
                const handrailMargin = 0.32;
                const adjustedMinX = stairBox.min.x + handrailMargin;
                const adjustedMaxX = stairBox.max.x - handrailMargin;
                if (personBox.min.x < adjustedMinX) {
                    personPos.x = adjustedMinX - porsonHalf.x - 1e-5;
                } else if (personBox.max.x > adjustedMaxX) {
                    personPos.x = adjustedMaxX + porsonHalf.x + 1e-5;
                }
                return new THREE.Vector3(
                    personPos.x,
                    personPos.y,
                    stairBox.max.z + porsonHalf.z + 1e-5
                );
            }
        }
        return null;
    }

    getGroundCorrectionPointIfBelow(personPos, personBox, porsonHalf) {
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
