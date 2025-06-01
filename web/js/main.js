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
    guiWidth: 220,
    backgroundColor: 0xbbbbbb,
    isSaveCameraState: true
});

let record = null;
let simulation = null;
let initializeSimulation = null;
const user = {
    escalatorPad: 1,
    spacing: 20,
    stairsNum: 20,
    peopleNum: 300,
    crowdMaxSpeed: 4,
    wantToRecord: false,
    toggleTargetLine: ()=> simulation && simulation.toggleTargetLine(),
    togglePause: ()=> simulation && simulation.togglePause(),
    restart: async ()=>{
        initializeSimulation();
        record && record.stop();
    }
}
record = new Record({
    time: 0.0,
    dt: 0.01
});
console.log(user)

initializeSimulation = async function (){
    if (simulation) simulation.dispose();
    simulation = new Simulation(grapher, {
        escalatorPad: user.escalatorPad,
        stairsNum: user.stairsNum,
        peopleNum: user.peopleNum,
        spacing: user.spacing,
        isShowTargetLine: false,
        labelColor: 0x666666,
        targetLineColor: 0xfff000,
        portalOriginalColor: 0x881133,
        portalEnteringColor: 0x0088ff,
        crowdColor: 0x90b38b,
        crowdMaxSpeed: user.crowdMaxSpeed,
        groundColor: 0x555556,
        isStartCallback: ()=>{
            record.start();
        },
        isPauseCallback: ()=>{
            record.stop();
        },
        updateCallback: (dt)=>{
        }
    });
    await simulation.initialize();
}

const folder = {
    object:   grapher.gui.addFolder('Axes & Line'),
    simulate: grapher.gui.addFolder('Simulation'),
    action:   grapher.gui.addFolder('Actions'),
};
Object.values(folder).forEach(f=>f.open());
const controller = {
    axes:    folder.object.add(grapher, 'toggleAxis').name("Toggle Axes"),
    line:    folder.object.add(user, 'toggleTargetLine').name("Toggle Target Line"),
    num:     folder.simulate.add(user, 'peopleNum', 10, 1000, 10).name("People"),
    starts:  folder.simulate.add(user, 'stairsNum', 10, 30, 5).name("Stairs"),
    vmax:    folder.simulate.add(user, 'crowdMaxSpeed', 0.1, 10.0, 0.1).name("Max Speed"),
    restart: folder.simulate.add(user, 'restart').name("Restart Simulation"),
    pause:   folder.action.add(user, 'togglePause').name("Pause / Start (Space)"),
    record:  folder.action.add(user, 'wantToRecord').name("Record"),
}

window.addEventListener('load', async () => {
    await initializeSimulation();
});