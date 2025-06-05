import * as THREE from 'three';
import Grapher from "./Grapher.js";
import Escalator from './Escalator.js';
import Crowd from './Crowd.js';
import Protal from './Protal.js';
import {rand, clamp, hex2css, vec3Arr2Array} from './utility.js';


export default class Simulation {
    constructor(grapher, config = {}) {
        this.grapher = grapher;
        this.time  = 0.0;
        this.clock = new THREE.Clock();

        this.config = {
            escalatorPad: config.escalatorPad || 1,
            stairsNum: config.stairsNum || 30,
            peopleNum: config.peopleNum || 200,
            spacing: config.spacing || 20,
            isShowTargetLine: config.isShowTargetLine || true,
            labelColor: 0x777777,
            targetLineColor: config.targetLineColor || 0xffe844,
            portalOriginalColor: config.portalOriginalColor || 0x881133,
            portalEnteringColor: config.portalEnteringColor || 0x0088ff,
            crowdMaxSpeed: config.crowdMaxSpeed || 4,
            crowdColor: 0x92CC92,
            groundColor: 0x333333,
            strategy: null,
            goLeftProb: 0.0,
            goLeftWalkProb: 0.0,
            isStartCallback: config.isStartCallback || (()=>{}),
            isPauseCallback: config.isPauseCallback || (()=>{}),
            updateCallback: config.updateCallback || (()=>{}),
            ...config
        };
        this.isPaused       = true;
        this.escalators     = [];
        this.protals        = [];
        this.crowds         = [];
        this.onStairPeople  = [];
        this.targetLines    = [];
        this.positionLabels = [];
        this.countLabels    = [];
        this.finishingNum   = [];

        this.goLeftIndices  = [];
        this.goLeftWalkIndices = [];

        this.currentIndex = { x: 0, y: 0 };
    }

    async initialize() {
        this.createEscalators();
        await this.loadEscalators();
        this.setupAnimation();
        this.initializeStrategy();

        this.onKeyDown = this.onKeyDown.bind(this);
        window.addEventListener('keydown', this.onKeyDown);
    }

    initializeStrategy() {
        const strategy = this.config.strategy;
        if (strategy==='forcePush'){
            console.log("Force Push [Strategy]");
        } else if (strategy==='shiftPosition'){
            console.log("Shift Position [Strategy]");
        } else if (strategy==='doNothing') {
            console.log("Do Nothing [Strategy]");
        }

        for(let i= 0; i < this.config.peopleNum; i++) {
            if (rand() < this.config.goLeftProb) {
                this.goLeftIndices.push(i);
            }
            if (rand() < this.config.goLeftWalkProb) {
                this.goLeftWalkIndices.push(i);
            }
        }
    }

    onKeyDown(e) {
        if (e.key === ' ') {
            this.togglePause();
        }else if (e.shiftKey && e.key === 'R') {
            this.resetCamera();
        }else if (e.key === 'ArrowRight') {
            this.step();
        }else if (!e.metaKey && !e.ctrlKey && !e.shiftKey && ['w', 's', 'a', 'd'].includes(e.key)) {
            this.moveCamera(e.key);
        }
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
                    groundSize: new THREE.Vector2(30, 30),
                    groundColor: this.config.groundColor,
                });
                this.escalators.push(escalator);
                const positionLabel = this.createPositionLabelForEscalator(escalator, `(${x},${y})`);
                this.positionLabels.push(positionLabel);

                const countLabel = this.createCountFinishingLabel(escalator, '0');
                this.countLabels.push(countLabel);
            }
        }
    }

    createPositionLabelForEscalator(escalator, text) {
        const labelPos = new THREE.Vector3(
            escalator.x0 + 0.5,
            escalator.ymax + 0.7,
            escalator.zmax + 0.8
        );
        return this.grapher.createLabel(
            text, labelPos, {
                class: ['escalator-label', 'id'],
                color: hex2css(this.config.labelColor)
            }
        );
    }

    createCountFinishingLabel(escalator, text) {
        const labelPos = new THREE.Vector3(
            escalator.x0 - 0.5,
            escalator.ymax + 0.6,
            escalator.zmax + 0.8
        );
        return this.grapher.createLabel(
            text, labelPos, {
                class: ['escalator-label', 'count'],
                color: hex2css(this.config.labelColor)
            }
        );
    }

    async loadEscalators() {
        const loadPromises = this.escalators.map(escalator => 
            new Promise(resolve => {
                escalator.load(this.grapher.scene, () => {
                    this.createCrowdForEscalator(escalator);
                    this.createProtalForEscalator(escalator);
                    this.addTargetLine(escalator);
                    this.finishingNum.push(0);
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
        this.targetLines.push(l1);
        this.targetLines.push(l2);

        if (this.config.isShowTargetLine) {
            this.showTargetLine();
        } else {
            this.hideTargetLine();
        }
    }

    toggleTargetLine() {
        this.config.isShowTargetLine = !this.config.isShowTargetLine;
        if (this.config.isShowTargetLine) {
            this.showTargetLine();
        } else {
            this.hideTargetLine();
        }
    }

    showTargetLine() {
        this.targetLines.forEach(line => {
            line.visible = true;
        });
        this.config.isShowTargetLine = true;
    }

    hideTargetLine() {
        this.targetLines.forEach(line => {
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
        if(this.isPaused) {
            this.config.isPauseCallback();
        } else {
            this.config.isStartCallback();
        }
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
        if (!ignorePause && this.isPaused) return;

        let dt = clamp(this.clock.getDelta(), 1e-5, 5e-3);
        dt = this.config.updateCallback(dt, this.time) || dt;

        this.time += dt;
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

    resetPersonForFinishing(escalatorIndex, personIndex, pos, vel, crowd, onStairPeopleIndex) {
        this.finishingNum[escalatorIndex]++;
        let html = `${this.finishingNum[escalatorIndex]}`;
        if(katex){
            html = katex.renderToString(html, {
                displayMode: true,
                output: this.katexOutput,
                throwOnError: true,
                trust: true
            });
        }
        this.countLabels[escalatorIndex].element.innerHTML = html;
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
            if (this.goLeftWalkIndices.includes(personIndex)) {
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
        vel.addScaledVector(repulsion,  400.0*dt);
        vel.addScaledVector(wallForce, 1000.0*dt);
        vel.addScaledVector(vel,        -10.0*dt);
        if (vel.length() > crowd.maxSpeed) {
            vel.normalize().multiplyScalar(crowd.maxSpeed);
        }
        if (escalator.readyToEnter(pos, box)) {
            if (this.config.strategy==='forcePush'){
                if (this.goLeftIndices.includes(personIndex)) {
                    vel.x -= 1.0;
                } else {
                    vel.x += 1.0;
                }
            } else if (this.config.strategy==='shiftPosition'){
                if (this.goLeftIndices.includes(personIndex)) {
                    pos.x = escalator.aisleXL;
                } else {
                    pos.x = escalator.aisleXR;
                }
            } else if (this.config.strategy==='doNothing') {

            }
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
                this.resetPersonForFinishing(index, personIndex, pos, vel, crowd, onStairPeopleIndex);
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

    snapshotMeta() {
        return {
            header: {
                t : 'time [code_time]',
                x : 'position [code_length]',
                v : 'position [code_length/code_time]',
                s : 'on_stair_people_indices [dimensionless]',
                f : 'finishing_number_of_people [dimensionless]',
            },
            escalatorId       : this.escalators.map(e => e.id),
            escalatorNum      : this.escalators.length,
            stairsNum         : this.config.stairsNum,
            peopleNum         : this.config.peopleNum,
            crowdMaxSpeed     : this.config.crowdMaxSpeed,
            escalatorPosition : vec3Arr2Array(this.escalators.map(e => e.position)),
            escalatorDy       : this.escalators.map(e => e.dy),
            escalatorDz       : this.escalators.map(e => e.dz),
            strategy          : this.config.strategy,
            goLeftProb        : this.config.goLeftProb,
            goLeftWalkProb    : this.config.goLeftWalkProb,
            goLeftIndices     : this.goLeftIndices,
            goLeftWalkIndices : this.goLeftWalkIndices,
        }
    }

    snapshot(minimal = false) {
        if (minimal) {
            return {
                t: this.time,
                e: this.escalators.map(e => e.id),
                f: this.finishingNum.map(f => f),
            };
        }
        return {
            t: this.time,
            x: this.crowds.map(c => vec3Arr2Array(c.positions)),
            v: this.crowds.map(c => vec3Arr2Array(c.velocities)),
            s: this.onStairPeople.map(s => Array.from(s)),
            f: this.finishingNum.map(f => f),
        };
    }

    dispose() {
        this.positionLabels.forEach(label => this.grapher.disposeObject(label));
        this.countLabels.forEach(label => this.grapher.disposeObject(label));
        this.targetLines.forEach(line => this.grapher.disposeObject(line));
        this.escalators.forEach(escalator => escalator.dispose());
        this.crowds.forEach(crowd => crowd.dispose());
        this.protals.forEach(protal => protal.dispose());
        window.removeEventListener('keydown', this.onKeyDown);
    }
}
