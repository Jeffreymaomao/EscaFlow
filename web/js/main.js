import * as THREE from 'three';
import Grapher from "./Grapher.js";
import Escalator from './Escalator.js';
import Crowd from './Crowd.js';
import Protal from './Protal.js';

import Simulation from './Simulation.js';
// ------------------------------------------
// initialize grapher
const grapher = new Grapher({
    cameraMinDistance: 1,
    cameraMaxDistance: 1000,
    axisLength: 1.0,
    isShowAxis: false,
    cameraPosition: new THREE.Vector3(1,-3, 3),
    stats: true,
    backgroundColor: 0xfffbf7,
    isSaveCameraState: true,
});

const simulation = new Simulation(grapher, {
    escalatorPad: 1,
    stairsNum: 30,
    peopleNum: 300,
    spacing: 20,
    isShowTargetLine: false,
    targetLineColor: 0xffd000,
    portalOriginalColor: 0x881133,
    portalEnteringColor: 0x0088ff,
    crowdColor: 0x82cc92,
    crowdMaxSpeed: 4,
});

window.addEventListener('load', async () => {
    await simulation.initialize();
})

window.addEventListener('keydown', (e) => {
    if (e.key === ' ') {
        simulation.togglePause();
        return;
    }
    
    if (e.shiftKey && e.key === 'R') {
        simulation.resetCamera();
        return;
    }
    
    if (e.key === 'ArrowRight') {
        simulation.step();
        return;
    }
    
    if (['w', 's', 'a', 'd'].includes(e.key)) {
        simulation.moveCamera(e.key);
    }
});