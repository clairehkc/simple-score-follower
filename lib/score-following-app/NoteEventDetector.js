class NoteEventDetector {
	constructor() {
		this.pitchDetector;
		this.chordDetector;
		this.nextExpectedNoteEvent;
	}

	init(audioContext, audioInput) {
	  noCanvas();
	  this.mic = audioInput;
	  this.pitchDetector = new PitchDetector(audioContext, this.mic);
	  this.chordDetector = new ChordDetector(audioContext, this.mic);
	  document.getElementById("start").addEventListener("click", this.startStream.bind(this));
	  document.getElementById("stop").addEventListener("click", this.stopStream.bind(this));
	  document.getElementById("updateNoteEvent").addEventListener("click", this.updateNextExpectedNoteEvent.bind(this));
	}

	updateNextExpectedNoteEvent() {
		const noteEventString = document.getElementById("noteEventInput").value;
		if (noteEventString) this.nextExpectedNoteEvent = new NoteEvent(noteEventString);
		console.log("updateNextExpectedNoteEvent", this.nextExpectedNoteEvent);
	}

	startStream() {
		this.mic.start(this.startDetection.bind(this), this.startStreamErrorCallback);
		if (this.mic.stream && this.mic.mediaStream) {
			this.startDetection();
		}
	}

	startDetection() {
		// will do switching here
		this.pitchDetector.startPitchDetection(this.mic);
		// this.chordDetector.startChordDetection(this.mic);
	}

	startStreamErrorCallback(err) {
		console.error(err);
		document.getElementById('status').innerHTML = 'Not Allowed';
	}

	stopStream() {
		// if (is chord detecting) this.chordDetector.stopAnalyzer();
		this.mic.stop();
		document.getElementById('status').innerHTML = 'Off';
	}
}
