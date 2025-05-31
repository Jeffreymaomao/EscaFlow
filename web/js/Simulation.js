import * as THREE from 'three';
import Grapher from "./Grapher.js";
import Escalator from './Escalator.js';
import Crowd from './Crowd.js';
import Protal from './Protal.js';
import {rand, clamp} from './utility.js';


export default class Simulation {
    constructor(grapher, config = {}) {
        this.grapher = grapher;
        this.clock = new THREE.Clock();

        this.config = {
            escalatorPad: config.escalatorPad || 1,
            stairsNum: config.stairsNum || 30,
            peopleNum: config.peopleNum || 200,
            spacing: config.spacing || 20,
            isShowTargetLine: config.isShowTargetLine || true,
            targetLineColor: config.targetLineColor || 0xffe844,
            portalOriginalColor: config.portalOriginalColor || 0x881133,
            portalEnteringColor: config.portalEnteringColor || 0x0088ff,
            crowdMaxSpeed: config.crowdMaxSpeed || 4,
            crowdColor: 0x92CC92,
            ...config
        };
        this.isPaused = true;
        this.escalators = [];
        this.protals = [];
        this.crowds = [];
        this.onStairPeople = [];
        this.targetLine = [];

        this.currentIndex = { x: 0, y: 0 };
    }

    async initialize() {
        this.createEscalators();
        await this.loadEscalators();
        this.setupAnimation();
    }

    getOffsetFromIndex(ix, iy) {
        return new THREE.Vector3(
            ix * 20, iy * 20 - 2, -0.5
        );
    }

    createEscalators() {
        const pad = this.config.escalatorPad;
        const stairsNum = this.config.stairsNum;
        
        for (let x = -pad; x <= pad; x++) {
            for (let y = -pad; y <= pad; y++) {
                const offset = this.getOffsetFromIndex(x, y);
                const escalator = new Escalator({
                    url: `./model/escalator-${stairsNum}.glb`,
                    scale: [0.8, 0.5, 0.5],
                    id: `Esca${stairsNum}-(${x},${y})`,
                    position: offset,
                    groundSize: new THREE.Vector2(30, 30)
                });
                this.escalators.push(escalator);
            }
        }
    }
    async loadEscalators() {
        const loadPromises = this.escalators.map(escalator => 
            new Promise(resolve => {
                escalator.load(this.grapher.scene, () => {
                    this.createCrowdForEscalator(escalator);
                    this.createProtalForEscalator(escalator);
                    this.addTargetLine(escalator);
                    resolve();
                });
            })
        );
        
        await Promise.all(loadPromises);
    }

    createCrowdForEscalator(escalator) {
        const crowd = new Crowd({
            count: this.config.peopleNum,
            maxSpeed: this.config.crowdMaxSpeed,
            color: this.config.crowdColor,
            position: new THREE.Vector3(
                escalator.position.x,
                escalator.position.y,
                escalator.groundPosition.z,
            )
        });

        crowd.addToScene(this.grapher.scene);
        crowd.initializePositions(escalator.box, 500, new THREE.Vector3(0, 0, 0));

        this.crowds.push(crowd);
        this.onStairPeople.push(new Set());
    }

    createProtalForEscalator(escalator) {
        const protal = new Protal({
            position: new THREE.Vector3(
                escalator.x0,
                escalator.box.max.y,
                escalator.zmax 
            ),
            color: this.config.portalOriginalColor,
            size: new THREE.Vector3(0.9, 0.12, 0.8)
        });
        this.protals.push(protal);
        protal.addToScene(this.grapher.scene);
    }

    addTargetLine(escalator) {
        const l1 = this.grapher.addLine(
            [...escalator.enteringPoint],
            [...escalator.enteringPoint.clone().add(
                new THREE.Vector3(0, 0, 3)
            )], {color: this.config.targetLineColor}
        );
        const l2 = this.grapher.addLine(
            [...escalator.exitingPoint],
            [...escalator.exitingPoint.clone().add(
                new THREE.Vector3(0, 0, 3)
            )], {color: this.config.targetLineColor}
        );
        this.targetLine = [l1, l2];

        if (this.config.isShowTargetLine) {
            this.showTargetLine();
        } else {
            this.hideTargetLine();
        }
    }

    toogleTargetLine() {
        this.targetLine.forEach(line => {
            line.visible = !line.visible;
        });
        this.config.isShowTargetLine = !this.config.isShowTargetLine;
    }

    showTargetLine() {
        this.targetLine.forEach(line => {
            line.visible = true;
        });
        this.config.isShowTargetLine = true;
    }

    hideTargetLine() {
        this.targetLine.forEach(line => {
            line.visible = false;
        });
        this.config.isShowTargetLine = false;
    }

    setupAnimation() {
        this.grapher.animate = (ignorePause) => {
            this.update(ignorePause);
        };
    }

    togglePause() {
        this.isPaused = !this.isPaused;
    }

    step() {
        if (!this.isPaused) return;
        this.grapher.animate(true);
    }

    moveCamera(direction) {
        const pad = this.config.escalatorPad;
        const currentEscaOffset    = this.getOffsetFromIndex(this.currentIndex.x, this.currentIndex.y);
        const controlsTargetOffset = this.grapher.controls.target.clone().sub(currentEscaOffset);
        const cameraPositionOffset = this.grapher.camera.position.clone().sub(currentEscaOffset);
        switch (direction) {
            case 'w': this.currentIndex.y++; break;
            case 's': this.currentIndex.y--; break;
            case 'a': this.currentIndex.x--; break;
            case 'd': this.currentIndex.x++; break;
        }
        this.currentIndex.x = clamp(this.currentIndex.x, -pad, pad);
        this.currentIndex.y = clamp(this.currentIndex.y, -pad, pad);
        const targetEscaOffset = this.getOffsetFromIndex(this.currentIndex.x, this.currentIndex.y);
        this.grapher.camera.position.copy(targetEscaOffset.clone().add(cameraPositionOffset));
        this.grapher.controls.target.copy(targetEscaOffset.clone().add(controlsTargetOffset));
        this.grapher.controls.update();
    }

    resetCamera() {
        this.currentIndex = { x: 0, y: 0 };
        this.grapher.camera.position.set(2, -4, 2);
        this.grapher.controls.target.set(0, 0, 0);
        this.grapher.controls.update();
    }

    update(ignorePause = false) {
        const dt = clamp(this.clock.getDelta(), 1e-7, 1e-2);
        
        if (!ignorePause && this.isPaused) return;
        
        this.escalators.forEach((escalator, index) => {
            escalator.update(dt);
            this.updateCrowdForEscalator(escalator, index, dt);
        });
    }


    // For some visual effects
    changePortalColorForEntering(protal) {
        protal.setColor(this.config.portalEnteringColor);
        setTimeout(()=>{protal.setColor(this.config.portalOriginalColor)}, 200);
    }

    // main simulation logic

    resetPersonForFinishing(personIndex, pos, vel, crowd, onStairPeopleIndex) {
        // if the person is finished, reset position and velocity
        pos.copy(crowd.generateRandomPoint());
        onStairPeopleIndex.delete(personIndex);
    }

    updatePersonOnStair(pos, vel, box, porsonHalf, escalator, repulsion, dt, personIndex) {
        const posAtFeet = pos.clone().setZ(pos.z - porsonHalf.z - escalator.halfSize.z);
        const escalatorVel = escalator.getVelocity(posAtFeet);
        const backwardRepulsionX = repulsion.x < 0.0 ? repulsion.x : 0.0;
        // the person is on the left
        if (pos.x < escalator.x0) {
            if (personIndex % 10 !== 0 && !backwardRepulsionX) {
                pos.y += 1.0 * dt;
            }
        }

        pos.addScaledVector(escalatorVel, dt);
        const onStairPos = escalator.getStairSurfacePointIfCollision(pos, box, porsonHalf);
        if (onStairPos) pos.copy(onStairPos);
    }

    updatePersonNotOnStair(pos, vel, escalator, crowd, box, porsonHalf,
                          onStairPeopleIndex, repulsion, dt, personIndex) {
        const onStairPos = escalator.getStairSurfacePointIfCollision(pos, box, porsonHalf);
        if (onStairPos) {
            vel.set(0, 0, 0);
            if(!crowd.isPersonAlreadyBumpIntoOther(onStairPos, personIndex)) {
                onStairPeopleIndex.add(personIndex);
                pos.copy(onStairPos);
                return;
            }
        }
        const onGroundPos = escalator.getGroundCorrectionPointIfBelow(pos, box, porsonHalf);
        if (onGroundPos && vel.z < 0) {
            onStairPeopleIndex.delete(personIndex);
            pos.copy(onGroundPos);
            vel.z = 0;
            return;
        }
        const goToStairs = escalator.getGoUpStairForce(pos);
        const wallForce  = escalator.getForceByWall(pos, box, vel);
        vel.addScaledVector(goToStairs, onStairPos ? 0 : 40.0*dt );
        vel.addScaledVector(repulsion,  120.0*dt);
        vel.addScaledVector(wallForce,  1000.0*dt);
        vel.addScaledVector(vel,        -10.0*dt);
        if (vel.length() > crowd.maxSpeed) {
            vel.normalize().multiplyScalar(crowd.maxSpeed);
        }

        pos.addScaledVector(vel, dt);
    }

    updateCrowdForEscalator(escalator, index, dt) {
        const crowd = this.crowds[index];
        const protal = this.protals[index];
        const onStairPeopleIndex = this.onStairPeople[index];
        crowd.update((pos, vel, box, personIndex)=>{
            protal.updateColor(dt);
            if (escalator.isPersonFinished(pos)){
                this.resetPersonForFinishing(personIndex, pos, vel, crowd, onStairPeopleIndex);
                this.changePortalColorForEntering(protal);
                return;
            }
            const repulsion      = crowd.getRepulsionFromOthers(personIndex, pos);
            const porsonHalf     = box.getSize(new THREE.Vector3()).divideScalar(2);
            const alreadyOnStair = onStairPeopleIndex.has(personIndex);
            if (alreadyOnStair) {
                this.updatePersonOnStair(pos, vel, box, porsonHalf, escalator, repulsion, dt, personIndex);
                return;
            }
            this.updatePersonNotOnStair(
                pos, vel, escalator, crowd, box, porsonHalf,
                onStairPeopleIndex, repulsion, dt, personIndex
            ); 
        });
    }
}
