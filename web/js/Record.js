export default class Record {
    constructor(config={}) {
        Object.assign(this, {
            downloadCallback: (()=>{}),
        }, config);
        this.label = null;
        this.frames = [];
        this.isRecording = false;
        this.initRecordingLabel();

        window.addEventListener('beforeunload', this.onBeforeUnload.bind(this));
        window.addEventListener('keydown', this.onKeyDown.bind(this));
    }

    onBeforeUnload(e) {
        this.clear();
    }

    onKeyDown(e) {
        if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            const filename = window.prompt("Enter filename to save the recording:", "recording.json");
            this.download(filename);
        }
    }

    start() {
        this.label && this.label.classList.add('recording');
        this.isRecording = true;
    }

    stop() {
        this.label && this.label.classList.remove('recording');
        this.isRecording = false;
    }

    clear() {
        if (!this.frames || this.frames.length === 0) return;
        this.stop();
        const confirmed = window.confirm("Clear recording?");
        if (!confirmed) return;
        this.frames.length = 0;
        this.frames = null;
        setTimeout(() => {this.frames = []}, 0);
    }

    add(data) {
        if (!this.isRecording) return;
        this.frames.push(data);
    }

    initRecordingLabel() {
        this.label = document.createElement('div');
        this.label.id = 'record-indicator';
        this.label.innerText = 'REC';
        document.body.appendChild(this.label);
    }

    download(filename = 'recording.json') {
        const data = this?.downloadCallback(this.frames) || this.frames;
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
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