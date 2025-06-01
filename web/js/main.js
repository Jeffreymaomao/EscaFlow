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
    peopleNum: 150,
    crowdMaxSpeed: 4,
    wantToRecord: false,
    recordDt: 0.01,
    toggleTargetLine: ()=> simulation && simulation.toggleTargetLine(),
    togglePause: ()=> simulation && simulation.togglePause(),
    restart: async ()=>{
        initializeSimulation();
        record && record.clear();
        record && (record.time = 0.0);
    },
    strategy: 1,
}

const strategies =  {
    'AlaAlaAla': 1,
    'BlaBlaBla': 2,
    'ClaClaCla': 3,
    'DlaDlaDla': 4,
    'ElaElaEla': 5,
}

record = new Record({
    time: 0.0,
    dt: user.recordDt,
    downloadCallback: (data)=>{
        return {
            meta: simulation && simulation.snapshotMeta(),
            frames: data
        }
    }
});

window.record = record;

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
            user.wantToRecord && record.start();
        },
        isPauseCallback: ()=>{
            record.stop();
        },
        updateCallback: (dt, now)=>{
            if (Math.abs(now - record.time) < 1e-8) {
                if (user.wantToRecord) {
                    if (!record.isRecording) record.start();
                    console.log(now.toFixed(3));
                    simulation && record.add(simulation.snapshot());
                } else {
                    if (record.isRecording) record.stop();
                }
                record.time += record.dt;
            }
            if (now + dt > record.time) {
                return dt = record.time - now;
            }
            return dt;
        }
    });
    await simulation.initialize();
    window.simulation = simulation;
}

const folder = {
    object:   grapher.gui.addFolder('Axes & Line'),
    simulate: grapher.gui.addFolder('Simulation'),
    action:   grapher.gui.addFolder('Actions'),
};
// grapher.gui.close();
Object.values(folder).forEach(f=>f.open());
const controller = {
    axes:     folder.object.add(grapher, 'toggleAxis').name("Toggle Axes"),
    line:     folder.object.add(user, 'toggleTargetLine').name("Toggle Target Line"),
    pad:      folder.simulate.add(user, 'escalatorPad', 0, 5, 1).name("Padding"),
    num:      folder.simulate.add(user, 'peopleNum', 1, 1000, 1).name("People"),
    starts:   folder.simulate.add(user, 'stairsNum', 10, 30, 5).name("Stairs"),
    vmax:     folder.simulate.add(user, 'crowdMaxSpeed', 0.1, 10.0, 0.1).name("Max Speed"),
    strategy: folder.simulate.add(user, 'strategy', strategies).name("Strategy"),
    restart:  folder.simulate.add(user, 'restart').name("Restart Simulation"),
    pause:    folder.action.add(user, 'togglePause').name("Pause / Start (Space)"),
    record:   folder.action.add(user, 'wantToRecord').name("Record"),
    recordDt: folder.action.add(user, 'recordDt', 0.01, 0.1, 0.01).name("Record Interval"),
}

window.addEventListener('load', async () => {
    await initializeSimulation();
});