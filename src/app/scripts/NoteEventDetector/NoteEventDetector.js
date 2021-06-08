class NoteEventDetector {
	constructor(audioContext, audioInput, readyCallback, matchCallback) {
		this.nextExpectedNoteEvent;
		this.activeDetector = undefined;
		this.streamIsActive = false;
		this.isUsingTestInterface = false;

		noCanvas();
		this.audioContext = audioContext;
		this.mic = audioInput;
		this.logTable = this.setUpLogTable();
		if (document.getElementById("updateNoteEvent")) {
			this.isUsingTestInterface = true;
			this.micStatus = document.getElementById('micStatus');
			this.startButton = document.getElementById("startStream");
			this.stopButton = document.getElementById("stopStream");
			this.startButton.addEventListener("click", this.startStream.bind(this));
			this.stopButton.addEventListener("click", this.stopStream.bind(this));
			this.startButton.disabled = true;
			this.stopButton.disabled = true;
			document.getElementById("updateNoteEvent").addEventListener("click", this.setNextExpectedNoteEvent.bind(this));
			document.getElementById("saveLog").addEventListener("click", this.saveLog.bind(this));
			document.getElementById("clearLog").addEventListener("click", this.clearLog.bind(this));
		}
		this.pitchDetector = new PitchDetector(audioContext, readyCallback, matchCallback, this.logTable, this.isUsingTestInterface);
		this.chordDetector = new ChordDetector(audioContext, matchCallback, this.logTable, this.isUsingTestInterface);
	}

	setNextExpectedNoteEvent(noteEventString, scoreEventId) {
		if (this.isUsingTestInterface) {
			noteEventString = document.getElementById("noteEventInput").value;
			if (noteEventString) noteEventString = noteEventString.toUpperCase();
		}

		if (!noteEventString) {
			alert("Enter an Event to Detect");
			return;
		}

		this.nextExpectedNoteEvent = new NoteEvent(noteEventString, scoreEventId);
		if (this.mic.stream) this.startDetection();
		if (this.isUsingTestInterface && this.startButton.disabled) this.startButton.disabled = false;
	}

	startStream() {
		if (this.streamIsActive) return;
		this.audioContext.resume();
		this.mic.start(this.startDetection.bind(this), this.onStartStreamError);
		if (this.isUsingTestInterface) {
			this.micStatus.innerHTML = 'On';
			this.startButton.disabled = true;
			this.stopButton.disabled = false;
		}
		this.streamIsActive = true;
	}

	startDetection() {
		if (!this.pitchDetector.detector && !this.chordDetector.analyzer) {
			this.pitchDetector.initializePitchDetector(this.mic);
			this.chordDetector.initializeAnalyzer(this.mic);
		}

		if (!this.nextExpectedNoteEvent) return;
		if (this.nextExpectedNoteEvent.isMonophonic) {
			this.pitchDetector.nextExpectedNoteEvent = this.nextExpectedNoteEvent;
			if (this.activeDetector !== "PITCH") {
				this.chordDetector.stop();
				this.pitchDetector.startPitchDetection();
				this.activeDetector = "PITCH";
			}
		} else {
			this.chordDetector.nextExpectedNoteEvent = this.nextExpectedNoteEvent;
			if (this.activeDetector !== "CHORD") {
				this.pitchDetector.stop();
				this.chordDetector.startChordDetection();
				this.activeDetector = "CHORD";
			}
		}
		if (this.isUsingTestInterface) document.getElementById('activeDetector').innerHTML = this.activeDetector;
	}

	onStartStreamError(err) {
		alert("Check microphone permissions");
		console.error(err);
		if (this.isUsingTestInterface) {
			this.micStatus.innerHTML = 'Not Allowed';
			this.streamIsActive = false;
		}
	}

	stopStream() {
		this.audioContext.suspend();
		this.pitchDetector.stop();
		this.chordDetector.stop();
		this.mic.stop();
		this.activeDetector = undefined;
		this.streamIsActive = false;
		if (this.isUsingTestInterface) {
			this.micStatus.innerHTML = 'Off';
			this.startButton.disabled = false;
			this.stopButton.disabled = true;
		}
		this.pitchDetector.detector = undefined;
		this.chordDetector.analyzer = undefined;
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
