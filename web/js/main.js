import * as THREE from 'three';
import Grapher from "./Grapher.js";
import Escalator from './Escalator.js';
import Crowd from './Crowd.js';
import Protal from './Protal.js';
// ------------------------------------------
const {sqrt, sin, cos, pow, PI, acos, floor, ceil} = Math; // for convenience
const rand = (min=0,max=1)=> {return (max-min)*Math.random()+min}
const clamp = (x, min=0,max=1)=> {return x < min ? min : (x > max ? max : x)}
// ------------------------------------------
const user = {
    pause: true
};
// ------------------------------------------
// initialize grapher
const grapher = new Grapher({
    cameraMinDistance: 1,
    cameraMaxDistance: 1000,
    axisLength: 1.0,
    showAxis: false,
    cameraPosition: new THREE.Vector3(1,-3, 3),
    stats: true,
    backgroundColor: 0xfffbf7,
    isSaveCameraState: true,
    // backgroundImage: 'img/rostock_laage_airport_2k.hdr'
});
// ------------------------------------------
const escalators = [];
const protals = [];
const crowds = [];
const onStairPeople = [];
const count = 2;
const offsetFromIndex = function(ix, iy){
    return new THREE.Vector3(
        ix * 20, iy * 20 - 2, -0.5
    );
}
for (var x = -count; x <= count; x+=1) {
    for (var y = -count; y <= count; y+=1) {
        const offset = offsetFromIndex(x, y);
        const escalator = new Escalator({
            url: './model/escalator-10.glb',
            // url: './model/escalator-15.glb',
            // url: './model/escalator-20.glb',
            scale: [0.8, 0.5, 0.5],
            position: offset,
            groundSize: new THREE.Vector2(30,30)
        });
        escalators.push(escalator);
    }
}
window.addEventListener('load', () => {
    escalators.forEach((escalator) => {
        escalator.load(grapher.scene, ()=>{
            // after loading the escalator, we can get the box
            const crowd = new Crowd({
                count: 20,
                maxSpeed: 4,
                position: new THREE.Vector3(
                    escalator.position.x,
                    escalator.position.y,
                    escalator.groundPosition.z,
                )
            });
            // console.log(crowd.position, escalator.position)
            crowd.addToScene(grapher.scene);
            crowd.initializePositions(escalator.box, 500, new THREE.Vector3(0, 0, 0));
            // add to global arrays
            crowds.push(crowd);
            onStairPeople.push(new Set());

            const protal = new Protal({
                position: new THREE.Vector3(
                    escalator.x0,
                    escalator.box.max.y,
                    escalator.zmax 
                ),
                color: 0x881133,
                size: new THREE.Vector3(0.9, 0.12, 0.8)
            });
            protals.push(protal);
            protal.addToScene(grapher.scene);
        });
        // additional line
        grapher.addLine(
            [...escalator.enteringPoint],
            [...escalator.enteringPoint.clone().add(
                new THREE.Vector3(0, 0, 3)
            )], {color: '#ffe844'}
        );
        grapher.addLine(
            [...escalator.exitingPoint],
            [...escalator.exitingPoint.clone().add(
                new THREE.Vector3(0, 0, 3)
            )], {color: '#ffe844'}
        );
    });
});
// ------------------------------------------
// start to animate
const clock = new THREE.Clock();
grapher.animate = function(ignorePause) {
    const dt = clamp(clock.getDelta(), 1e-7, 1e-2);
    // const dt = 0.02; // fixed time step for consistency
    if(!ignorePause && user.pause) return;
    escalators.forEach((escalator, index) => {
        escalator.update(dt);
        // === updata human ===
        const crowd = crowds[index];
        const protal = protals[index];
        const onStairPeopleIndex = onStairPeople[index];
        crowd.update((pos, vel, box, i)=>{
            protal.updateColor(dt);
            if (escalator.isPersonFinished(pos)){
                // if the person is finished, reset position and velocity
                pos.copy(crowd.generateRandomPoint());
                vel.set(0, 0, -9.8);
                onStairPeopleIndex.delete(i);
                protal.setColor(0x0088ff);
                setTimeout(()=>{protal.setColor(0x881133)}, 200);
                return;
            }

            const porsonHalf     = box.getSize(new THREE.Vector3()).divideScalar(2);
            const alreadyOnStair = onStairPeopleIndex.has(i);
            if (alreadyOnStair) {
                const posAtFeet = pos.clone().setZ(pos.z - porsonHalf.z - escalator.halfSize.z);
                const vel = escalator.getVelocity(posAtFeet);
                pos.addScaledVector(vel, dt);
                const onStairPos = escalator.getStairSurfacePointIfCollision(pos, box, porsonHalf);
                if (onStairPos) pos.copy(onStairPos);
                return;
            }

            const onStairPos = escalator.getStairSurfacePointIfCollision(pos, box, porsonHalf);
            if (onStairPos) {
                vel.set(0, 0, 0);
                if(!crowd.isPersonAlreadyBumpIntoOther(onStairPos, i)) {
                    onStairPeopleIndex.add(i);
                    pos.copy(onStairPos);
                    return;
                }
            }
            const onGroundPos = escalator.getGroundCorrectionPointIfBelow(pos, box, porsonHalf);
            if (onGroundPos && vel.z < 0) {
                onStairPeopleIndex.delete(i);
                pos.copy(onGroundPos);
                vel.z = 0;
                return;
            }
            const goToStairs = escalator.getGoUpStairForce(pos);
            const wallForce  = escalator.getForceByWall(pos, box);
            const repulsion  = crowd.getRepulsionFromOthers(i, pos);
            vel.addScaledVector(goToStairs, (onStairPos && !alreadyOnStair) ? 0 : 40.0*dt );
            vel.addScaledVector(repulsion,  80.0*dt);
            vel.addScaledVector(wallForce,  100.0*dt);
            vel.addScaledVector(vel,        -10.0*dt);
            if (vel.length() > crowd.maxSpeed) {
                vel.normalize().multiplyScalar(crowd.maxSpeed);
            }

            pos.addScaledVector(vel, dt);
        });
    });
};
// ------------------------------------------
let currentIndex = { x: 0, y: 0 };
window.addEventListener('keydown', (e) => {
    if (e.key === ' ') {
        user.pause = !user.pause;
        return;
    } if (e.shiftKey && e.key === 'R') {
        currentIndex = { x: 0, y: 0 };
        grapher.camera.position.set(2, -4, 2);
        grapher.controls.target.set(0, 0, 0);
        grapher.controls.update();
        return;
    } else if (e.key === 'ArrowRight') {
        if(!user.pause) return;
        grapher.animate(true);
        return;
    }

    if (!['w', 's', 'a', 'd'].includes(e.key)) return;
    const currentEscaOffset     = offsetFromIndex(currentIndex.x, currentIndex.y);
    const controlsTargetOffset  = grapher.controls.target.clone().sub(currentEscaOffset);
    const cameraPositionOffset  = grapher.camera.position.clone().sub(currentEscaOffset);
    switch (e.key) {
        case 'w': currentIndex.y++; break;
        case 's': currentIndex.y--; break;
        case 'a': currentIndex.x--; break;
        case 'd': currentIndex.x++; break;
    }
    currentIndex.x = clamp(currentIndex.x, -count, count);
    currentIndex.y = clamp(currentIndex.y, -count, count);
    const targetEscaOffset      = offsetFromIndex(currentIndex.x, currentIndex.y);
    grapher.camera.position.copy(targetEscaOffset.clone().add(cameraPositionOffset));
    grapher.controls.target.copy(targetEscaOffset.clone().add(controlsTargetOffset));
    grapher.controls.update();
});