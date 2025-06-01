import * as THREE from 'three';
import Grapher from "./Grapher.js";
import Escalator from './Escalator.js';
import Crowd from './Crowd.js';
import Protal from './Protal.js';
import Simulation from './Simulation.js';
import Record from './Record.js';

const grapher = new Grapher({
    cameraMinDistance: 1,
    cameraMaxDistance: 1000,
    axisLength: 1.0,
    isShowAxis: false,
    cameraPosition: new THREE.Vector3(1,-3, 3),
    stats: true,
    gui: true,
    guiWidth: 200,
    backgroundColor: 0xbbbbbb,
    isSaveCameraState: true
});

const record = new Record();

const simulation = new Simulation(grapher, {
    escalatorPad: 1,
    stairsNum: 30,
    peopleNum: 300,
    spacing: 20,
    isShowTargetLine: false,
    labelColor: 0x666666,
    targetLineColor: 0xfff000,
    portalOriginalColor: 0x881133,
    portalEnteringColor: 0x0088ff,
    crowdColor: 0x90b38b,
    crowdMaxSpeed: 4,
    groundColor: 0x555556,
    isStartCallback: ()=>{
        record.start();
    },
    isPauseCallback: ()=>{
        record.stop();
    },
    updateCallback: (dt)=>{
        if(simulation.time>1){
            simulation.togglePause();
            console.log(`Simulation time: ${simulation.time.toFixed(6)} seconds`);
            simulation.dispose();
        }
    }
});

const folder = {
    object: grapher.gui.addFolder('Axes & Box'),
    action: grapher.gui.addFolder('Actions')
};
Object.values(folder).forEach(f=>f.open());
const controller = {
    axes: folder.object.add(grapher, 'toggleAxis').name("Click to toggle axes"),
    line: folder.object.add(simulation, 'toggleTargetLine').name("Click to toggle target line"),
    pause: folder.action.add(simulation, 'togglePause').name("Click to pause/start simulation"),
}

window.addEventListener('load', async () => {
    await simulation.initialize();
});