class NoteEventDetector {
	constructor(audioContext, audioInput) {
		this.nextExpectedNoteEvent;
		this.activeDetector = undefined;

		noCanvas();
		this.mic = audioInput;
		this.pitchDetector = new PitchDetector(audioContext, this.mic);
		this.chordDetector = new ChordDetector(audioContext, this.mic);
		document.getElementById("start").addEventListener("click", this.startStream.bind(this));
		document.getElementById("stop").addEventListener("click", this.stopStream.bind(this));
		document.getElementById("updateNoteEvent").addEventListener("click", this.setNextExpectedNoteEvent.bind(this));
	}

	setNextExpectedNoteEvent() {
		const noteEventString = document.getElementById("noteEventInput").value;
		if (!noteEventString) return;
		this.nextExpectedNoteEvent = new NoteEvent(noteEventString);
		if (this.mic.stream) this.startDetection();
	}

	startStream() {
		this.mic.start(this.startDetection.bind(this), this.startStreamErrorCallback);
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
		console.error(err);
		document.getElementById('status').innerHTML = 'Not Allowed';
	}

	stopStream() {
		this.pitchDetector.stop();
		this.chordDetector.stop();
		this.mic.stop();
		this.activeDetector = undefined;
		document.getElementById('status').innerHTML = 'Off';
	}
}
