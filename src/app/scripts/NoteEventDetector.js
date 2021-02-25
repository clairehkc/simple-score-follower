class NoteEventDetector {
	constructor(audioContext, audioInput) {
		this.nextExpectedNoteEvent;
		this.activeDetector = undefined;
		this.streamIsActive = false;

		noCanvas();
		this.audioContext = audioContext;
		this.mic = audioInput;
		this.pitchDetector = new PitchDetector(audioContext, this.mic);
		this.chordDetector = new ChordDetector(audioContext, this.mic);
		document.getElementById("updateNoteEvent").addEventListener("click", this.setNextExpectedNoteEvent.bind(this));
		document.getElementById("start").addEventListener("click", this.startStream.bind(this));
		document.getElementById("stop").addEventListener("click", this.stopStream.bind(this));
		document.getElementById("start").disabled = true;
		document.getElementById("stop").disabled = true;
	}

	setNextExpectedNoteEvent() {
		const noteEventString = document.getElementById("noteEventInput").value;
		if (!noteEventString) {
			alert("Enter an Event to Detect");
			return;
		}
		this.nextExpectedNoteEvent = new NoteEvent(noteEventString);
		if (this.mic.stream) this.startDetection();
		document.getElementById("start").disabled = false;
	}

	startStream() {
		console.log("startStream", this.streamIsActive);
		if (this.streamIsActive) return;
		this.audioContext.resume();
		this.mic.start(this.startDetection.bind(this), this.startStreamErrorCallback);
		document.getElementById("stop").disabled = false;
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
	}

	startStreamErrorCallback(err) {
		alert("Check microphone permissions");
		console.error(err);
		document.getElementById('status').innerHTML = 'Not Allowed';
		this.streamIsActive = false;
	}

	stopStream() {
		this.pitchDetector.stop();
		this.chordDetector.stop();
		this.mic.stop();
		this.activeDetector = undefined;
		this.streamIsActive = false;
		document.getElementById('status').innerHTML = 'Off';
		document.getElementById("stop").disabled = true;
	}
}
