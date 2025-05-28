import * as THREE from 'three';
import Grapher from "./Grapher.js";
import Escalator from './Escalator.js';
import Crowd from './Crowd.js';
// ------------------------------------------
const {sqrt, sin, cos, pow, PI, acos, floor, ceil} = Math; // for convenience
const rand = (min=0,max=1)=> {return (max-min)*Math.random()+min}
const clamp = (x, min=0,max=1)=> {return x < min ? min : (x > max ? max : x)}
// ------------------------------------------
// initialize grapher
const grapher = new Grapher({
    cameraPosition: new THREE.Vector3(2,2,2),
    cameraMinDistance: 1,
    cameraMaxDistance: 1000,
    axisLength: 1.0,
    cameraPosition: new THREE.Vector3(1,-3, 3),
    stats: true,
    backgroundColor: 0xfffbf7,
    isSaveCameraState: false,
    // backgroundImage: 'img/rostock_laage_airport_2k.hdr'
});
// ------------------------------------------
const user = {
    pause: true
};
// ------------------------------------------
const escalators = [];
const crowds = [];
const onStairPeople = [];
const count = 1;
for (var x = -count; x <= count; x+=1) {
    for (var y = -count; y <= count; y+=1) {
        const offset = new THREE.Vector3(x*10, y*10 - 2, -0.5);
        const escalator = new Escalator({
            url: './model/escalator-15.glb',
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
            const crowd = new Crowd(grapher.renderer, {
                count: 400,
                maxSpeed: 2.5,
                position: escalator.position,
            });
            crowd.addToScene(grapher.scene);
            crowd.initializePositions(escalator.box, 500, new THREE.Vector3(0, -3, 0));
            // add to global arrays
            crowds.push(crowd);
            onStairPeople.push(new Set());
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
grapher.animate = function() {
    const dt = clamp(clock.getDelta(), 1e-7, 1e-2);
    // const dt = 0.02; // fixed time step for consistency
    if(user.pause) return;
    escalators.forEach((escalator, index) => {
        escalator.update(dt);
        // === updata human ===
        const crowd = crowds[index];
        const onStairPeopleIndex = onStairPeople[index];
        crowd.update((pos, vel, box, i)=>{

            if (escalator.isPersonFinished(pos)){
                // if the person is finished, reset position and velocity
                pos.copy(crowd.generateRandomPoint());
                vel.set(0, 0, -9.8);
                onStairPeopleIndex.delete(i);
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
window.addEventListener('keydown', (e) => {
    if (e.key === ' ') {
        user.pause = !user.pause;
    } else if (e.key === 'r') {
    } else if (e.key === 'ArrowRight') {
        if(!user.pause) return;
    }
});