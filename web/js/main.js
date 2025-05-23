import * as THREE from 'three';
import Grapher from "./Grapher.js";
import Escalator from './Escalator.js';
import Crowd from './Crowd.js';
// ------------------------------------------
const {sqrt, sin, cos, pow, PI, acos, floor, ceil} = Math; // for convenience
const rand = (min=0,max=1)=> {return (max-min)*Math.random()+min}
// ------------------------------------------
// initialize grapher
const grapher = new Grapher({
    cameraPosition: new THREE.Vector3(2,2,2),
    cameraMinDistance: 1,
    cameraMaxDistance: 1000,
    axisLength: 1.0,
    cameraPosition: new THREE.Vector3(1,-3, 3),
    stats: true,
    backgroundColor: 0xeeeeee,
    // backgroundImage: 'img/rostock_laage_airport_2k.hdr'
});
// ------------------------------------------
const user = {
    pause: true
};
// ------------------------------------------
const escalators = [];
const crowds =[];
const count = 1;
for (var x = -count; x <= count; x+=1) {
    for (var y = -count; y <= count; y+=1) {
        const offset = new THREE.Vector3(x*10, y*10 - 2, -0.5);
        const escalator = new Escalator({
            url: './model/escalator-15.glb',
            scale: [0.8, 0.5, 0.5],
            position: offset,
        });
        escalators.push(escalator);
        const crowd = new Crowd(grapher.renderer, {
            count: 200,
            position: offset
        });
        crowd.addToScene(grapher.scene);
        crowds.push(crowd);
    }
}
window.addEventListener('load', () => {
    escalators.forEach((escalator) => {
        escalator.load(grapher.scene);
        const line = grapher.addLine(
            [...escalator.enteringPoint],
            [...escalator.enteringPoint.clone().add(
                new THREE.Vector3(0, 0, 3)
            )]
        )
    });
});
// ------------------------------------------
// start to animate
const crowdSize = new THREE.Vector3(
    crowds[0].radius*2,
    crowds[0].radius*2,
    crowds[0].height
);
const clock = new THREE.Clock();
const gravity = new THREE.Vector3(0, 0, -9.8);

grapher.animate = function() {
    const dt = Math.max(clock.getDelta(), 1e-3);
    if(user.pause) return;
    escalators.forEach((escalator, index) => {
        escalator.update(dt);
        // === updata human ===
        const crowd = crowds[index];
        crowd.update((pos, vel, box, i)=>{
            const repulsion = crowd.getRepulsionFromOthers(i, pos);
            const goToStairs = escalator.enteringPoint.clone().sub(pos);
            const onStairPos = escalator.getStairSurfacePointIfCollision(pos, box);
            const wallForce  = escalator.getForceByWall(pos, box);
            if (onStairPos) {
                // vel.x = 0;
                // vel.y = 0;
                vel.z = 0;
                onStairPos.y += escalator.dy * dt;
                pos.copy(onStairPos);
                return;
            }
            vel.addScaledVector(goToStairs,  4.0*dt);
            vel.addScaledVector(repulsion,   20.0*dt);
            vel.addScaledVector(wallForce,  100.0*dt);
            vel.addScaledVector(vel,        -10.0*dt);
            vel.addScaledVector(gravity, dt);
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