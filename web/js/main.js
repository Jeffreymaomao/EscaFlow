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

const strategies =  {
    'Shift Position' : 'shiftPosition',
    'Force Push'     : 'forcePush',
    'Do Nothing'     : 'doNothing'
}
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
    minimalSnapshop: true,
    recordDt: 0.01,
    strategy: 'doNothing',
    goLeftProb: 0.1,
    goLeftWalkProb: 0.1,
    toggleTargetLine: ()=> simulation && simulation.toggleTargetLine(),
    togglePause: ()=> simulation && simulation.togglePause(),
    restart: async ()=>{
        initializeSimulation();
        record && record.clear();
        record && (record.time = 0.0);
    },
}

const params = new URLSearchParams(window.location.search);
for (const [key, value] of params.entries()) {
    if (key in user) {
        const originalType = typeof user[key];
        if (originalType === 'number') {
            user[key] = Number(value);
        } else if (originalType === 'boolean') {
            user[key] = value === 'true';
        } else {
            user[key] = value;
        }
    }
}

record = new Record({
    time: 0.0,
    dt: user.recordDt,
    downloadCallback: (data)=>{
        return {
            filename: `EscaFlow-${user.strategy}-L${user.goLeftProb.toFixed(2)}-LW${user.goLeftWalkProb.toFixed(2)}-${user.minimalSnapshop ? 'min' : 'full'}.json`,
            meta: simulation && simulation.snapshotMeta(),
            frames: data
        }
    }
});
const time_dom = document.createElement('div');
document.body.appendChild(time_dom);
katex.render(`t = 0.00`, time_dom, {
    throwOnError: false, displayMode: false,
});
time_dom.id = 'time';
time_dom.style.position = 'absolute';
time_dom.style.left = '30px';
time_dom.style.bottom = '16px';
time_dom.style.zIndex = '1000';
time_dom.style.color = '#ffffff';
const time_dom_float_dom = time_dom.querySelectorAll('.mord')[1];

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
        strategy: user.strategy,
        goLeftProb: user.goLeftProb,
        goLeftWalkProb: user.goLeftWalkProb,
        isStartCallback: ()=>{
            user.wantToRecord && record.start();
        },
        isPauseCallback: ()=>{
            record.stop();
        },
        updateCallback: (dt, now)=>{
            if (Math.abs(now - record.time) < 1e-8) {
                time_dom_float_dom.textContent = now.toFixed(2);
                if (user.wantToRecord) {
                    if (!record.isRecording) record.start();
                    simulation && record.add(simulation.snapshot(user.minimalSnapshop));
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
    window.simulation  = simulation;
    window.restart     = user.restart;
    window.togglePause = user.togglePause;
    window.record      = record;
    window.save        = record?.save.bind(record);
}

const folder = {
    object:   grapher.gui.addFolder('Axes & Line'),
    simulate: grapher.gui.addFolder('Simulation'),
    action:   grapher.gui.addFolder('Record Setup'),
};
// grapher.gui.close();
Object.values(folder).forEach(f=>f.open());
const controller = {
    toggleAxis       : folder.object.add(grapher, 'toggleAxis').name("Toggle Axes"),
    toggleTargetLine : folder.object.add(user, 'toggleTargetLine').name("Toggle Target Line"),
    togglePause      : folder.simulate.add(user, 'togglePause').name("Pause / Start (Space)"),
    escalatorPad     : folder.simulate.add(user, 'escalatorPad', 0, 5, 1).name("Padding"),
    peopleNum        : folder.simulate.add(user, 'peopleNum', 1, 1000, 1).name("People"),
    stairsNum        : folder.simulate.add(user, 'stairsNum', 10, 30, 5).name("Stairs"),
    crowdMaxSpeed    : folder.simulate.add(user, 'crowdMaxSpeed', 0.1, 10.0, 0.1).name("Max Speed"),
    strategy         : folder.simulate.add(user, 'strategy', strategies).name("Strategy"),
    goLeftProb       : folder.simulate.add(user, 'goLeftProb', 0.0, 1.0, 0.01).name("Left P"),
    goLeftWalkProb   : folder.simulate.add(user, 'goLeftWalkProb', 0.0, 1.0, 0.01).name("Walk(L) P"),
    restart          : folder.simulate.add(user, 'restart').name("Restart Simulation"),
    wantToRecord     : folder.action.add(user, 'wantToRecord').name("Record"),
    recordDt         : folder.action.add(user, 'recordDt', 0.01, 0.1, 0.01).name("Interval"),
    minimalSnapshop  : folder.action.add(user, 'minimalSnapshop').name("Minimize"),

}

window.addEventListener('load', async () => {
    await initializeSimulation();
});

function updateURLParam(key, value) {
    const params = new URLSearchParams(window.location.search);
    params.set(key, value);
    const newURL = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newURL);
}

for (const [key, guiItem] of Object.entries(controller)) {
    if (guiItem && guiItem.onChange && key in user && !(user[key] instanceof Function)) {
        guiItem.onChange(value => updateURLParam(key, value));
    }
}