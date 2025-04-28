import * as THREE from 'three';
import Grapher from "./Grapher.js";
import Escalator from './Escalator.js';
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
const count = 10;
for (var x = -count; x <= count; x+=1) {
    for (var y = -count; y <= count; y+=1) {
        const escalator = new Escalator({
            url: './model/escalator-15.glb',
            position: new THREE.Vector3(0, 0, 0),
            scale: [0.8, 0.5, 0.5],
            position: new THREE.Vector3(x*5, y*5 - 2, -0.5),
        });
        escalators.push(escalator);
    }
}
window.addEventListener('load', () => {
    escalators.forEach((escalator) => {
            escalator.load(grapher.scene);
    });
});
// ------------------------------------------
// start to animate
const clock = new THREE.Clock()
grapher.animate = function() {
    if(user.pause) return;
    escalators.forEach((escalator) => {
        escalator.update(clock.getDelta());
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