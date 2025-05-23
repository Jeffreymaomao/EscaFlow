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
    backgroundColor: 0xbbbbbb,
});
// ------------------------------------------
const user = {
    pause: true
};
// ------------------------------------------
const escalators = [];
const crowds =[];
const count = 0;
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
            count: 100,
            position: offset
        });
        crowd.addToScene(grapher.scene);
        crowds.push(crowd);
    }
}
window.addEventListener('load', () => {
    escalators.forEach((escalator) => {
        escalator.load(grapher.scene);
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
grapher.animate = function() {
    if(user.pause) return;
    escalators.forEach((escalator, index) => {
        escalator.update(clock.getDelta());
        // === updata human ===
        const crowd = crowds[index];
        crowd.update((pos, box, i)=>{
            pos.z -= 0.1;
            const newPos = escalator.getStairSurfacePointIfCollision(pos, box);
            if (newPos) {
                pos.copy(newPos);
            }
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