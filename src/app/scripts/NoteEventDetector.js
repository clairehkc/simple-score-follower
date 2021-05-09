class NoteEventDetector {
	constructor(audioContext, audioInput) {
		this.nextExpectedNoteEvent;
		this.activeDetector = undefined;
		this.streamIsActive = false;
		this.isUsingTestInterface = false;

		noCanvas();
		this.audioContext = audioContext;
		this.mic = audioInput;
		this.logTable = this.setUpLogTable();
		this.isReady = false;
		if (document.getElementById("updateNoteEvent")) {
			this.isUsingTestInterface = true;
			document.getElementById("updateNoteEvent").addEventListener("click", this.setNextExpectedNoteEvent.bind(this));
			document.getElementById("start").addEventListener("click", this.startStream.bind(this));
			document.getElementById("stop").addEventListener("click", this.stopStream.bind(this));
			document.getElementById("start").disabled = true;
			document.getElementById("stop").disabled = true;
			document.getElementById("saveLog").addEventListener("click", this.saveLog.bind(this));
			document.getElementById("clearLog").addEventListener("click", this.clearLog.bind(this));
		}
		this.pitchDetector = new PitchDetector(audioContext, this.logTable, this.isReady, this.isUsingTestInterface);
		this.chordDetector = new ChordDetector(audioContext, this.logTable, this.isUsingTestInterface);
	}

	checkIsReady() {
		return this.isReady;
	}

	setNextExpectedNoteEvent(noteEventString) {
		if (this.isUsingTestInterface) noteEventString = document.getElementById("noteEventInput").value;
		console.log("setNextExpectedNoteEvent", this.isUsingTestInterface);
		if (!noteEventString) {
			alert("Enter an Event to Detect");
			return;
		}
		this.nextExpectedNoteEvent = new NoteEvent(noteEventString);
		if (this.mic.stream) this.startDetection();
		if (this.isUsingTestInterface) document.getElementById("start").disabled = false;
	}

	startStream() {
		if (this.streamIsActive) return;
		this.audioContext.resume();
		this.mic.start(this.startDetection.bind(this), this.startStreamErrorCallback);
		if (this.isUsingTestInterface) {
			document.getElementById('micStatus').innerHTML = 'On';
			document.getElementById("stop").disabled = false;
		}
		this.streamIsActive = true;
	}

	startDetection() {
		if (!this.nextExpectedNoteEvent) return;
		if (this.nextExpectedNoteEvent.isMonophonic) {
			this.pitchDetector.nextExpectedNoteEvent = this.nextExpectedNoteEvent;
			if (this.activeDetector !== "PITCH") {
				this.chordDetector.stop();
				this.pitchDetector.startPitchDetection(this.mic);
				this.activeDetector = "PITCH";
			}
		} else {
			this.chordDetector.nextExpectedNoteEvent = this.nextExpectedNoteEvent;
			if (this.activeDetector !== "CHORD") {
				this.pitchDetector.stop();
				this.chordDetector.startChordDetection(this.mic);
				this.activeDetector = "CHORD";
			}
		}
		if (this.isUsingTestInterface) document.getElementById('activeDetector').innerHTML = this.activeDetector;
	}

	startStreamErrorCallback(err) {
		alert("Check microphone permissions");
		console.error(err);
		if (this.isUsingTestInterface) document.getElementById('micStatus').innerHTML = 'Not Allowed';
		this.streamIsActive = false;
	}

	stopStream() {
		this.audioContext.suspend();
		this.pitchDetector.stop();
		this.chordDetector.stop();
		this.mic.stop();
		this.activeDetector = undefined;
		this.streamIsActive = false;
		if (this.isUsingTestInterface) {
			document.getElementById('micStatus').innerHTML = 'Off';
			document.getElementById("stop").disabled = true;
		}
	}

	setUpLogTable() {
		const table = new p5.Table();
		table.addColumn('Type');
		table.addColumn('Input');
		table.addColumn('Expected');
		table.addColumn('Detected');
		table.addColumn('Guess');
		table.addColumn('Match');
		return table;
	}

	saveLog() {
		saveTable(this.logTable, 'note_event_detector_log.csv');
	}

	clearLog() {
		this.logTable.clearRows();
	}
}
