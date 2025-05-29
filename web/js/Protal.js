import * as THREE from 'three';

export default class Portal {
    constructor(config={}) {
        this.size   = config.size || new THREE.Vector3(1, 2, 0.2);
        this.width  = this.size.x;
        this.depth  = this.size.y;
        this.height = this.size.z;
        this.dz     = this.height * 0.002;
        this.direction = config.direction || new THREE.Vector3(0, 1, 0);

        this.colorLerpSpeed = 0.1;
        this.color = new THREE.Color(config.color || 0x00ffff);
        this.targetColor = this.color.clone();   
        this.geometry = new THREE.BoxGeometry(this.width, this.depth, this.height);
        this.material = new THREE.MeshStandardMaterial({ color: this.color });
        this.material.emissive.set(this.color);

        this.alreadyClear = false;
        this.position = config.position || new THREE.Vector3(0, 0, 0);
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.setPosition(this.position);
        this.setRotationFromDirection(this.direction);
    }

    setRotationFromDirection(dir) {
        const target = dir.clone().normalize();
        const up = new THREE.Vector3(0, 0, 1);
        const matrix = new THREE.Matrix4();

        matrix.lookAt(new THREE.Vector3(), target, up);
        matrix.multiply(new THREE.Matrix4().makeRotationX(Math.PI/2));
        this.mesh.quaternion.setFromRotationMatrix(matrix);
    }

    setPosition(position) {
        this.position = position;
        this.mesh.position.copy(position).add(new THREE.Vector3(0, 0, this.height/2));
    }

    setColor(hex) {
        this.targetColor.set(hex);
    }

    updateColor(dt) {
        this.color.lerp(this.targetColor, this.colorLerpSpeed * dt);
        if (this.mesh && this.mesh.material) {
            this.mesh.material.color.set(this.color);
            this.mesh.material.emissive.set(this.color);
            this.mesh.material.needsUpdate = true;
        }
    }

    decreaseHeight(dt) {
        this.setHeight(
            this.height - dt * this.dz
        );
    }

    setHeight(newHeight) {
        if (newHeight <= 0) {
            if (this.scene && this.scene instanceof THREE.Scene) {
                this.scene.remove(this.mesh);
            }
            this.geometry.dispose();
            this.material.dispose();
            this.mesh = null;
            this.alreadyClear = true;
            return;
        }
        if(!this.mesh) return;
        this.size.z = newHeight;
        this.height = newHeight;
        this.geometry.dispose();
        this.geometry = new THREE.BoxGeometry(this.width, this.depth, this.height);
        this.mesh.geometry = this.geometry;
        this.mesh.position.copy(this.position).add(new THREE.Vector3(0, 0, this.height/2));
    }

    getBox3() {
        return new THREE.Box3().setFromObject(this.mesh);
    }

    addToScene(scene) {
        scene.add(this.mesh);
        this.scene = scene;
    }
}
