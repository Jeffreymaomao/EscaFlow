export default class Record {
    constructor() {
        this.label = null;
        this.frames = [];
        this.isRecording = false;
        this.initRecordingLabel();
    }

    start() {
        this.label && this.label.classList.add('recording')
        this.isRecording = true;
    }

    stop() {
        this.label && this.label.classList.remove('recording')
        this.isRecording = false;
    }

    clear() {
        this.frames = [];
    }

    snapshot(data) {
        if (!this.isRecording) return;
        // optional: deep copy if needed
        const frame = data.map(({ pos, vel }) => ({
            pos: pos.toArray(),
            vel: vel.toArray()
        }));
        this.frames.push(frame);
    }

    initRecordingLabel() {
        this.label = document.createElement('div');
        this.label.id = 'record-indicator';
        this.label.innerText = 'REC';
        document.body.appendChild(this.label);
    }

    download(filename = 'recording.json') {
        const blob = new Blob([JSON.stringify(this.frames)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    get length() {
        return this.frames.length;
    }
}