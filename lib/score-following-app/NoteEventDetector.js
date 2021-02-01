class NoteEventDetector {
	constructor() {
		this.pitchDetector;
		this.chordDetector;
		console.log("NoteEventDetector created");
	}

	init(audioContext, audioInput) {
		console.log("init");
	  noCanvas();
	  this.audioContext = audioContext;
	  this.mic = audioInput;
	  this.pitchDetector = new PitchDetector(this.audioContext, this.mic);
	  this.chordDetector = new ChordDetector(this.audioContext, this.mic);
	  document.getElementById("start").addEventListener("click", this.startStream.bind(this));
	  document.getElementById("stop").addEventListener("click", this.stopStream.bind(this));
	}

	startStream() {
		this.chordDetector.start();
		// this.mic.start(this.startPitchDetection.bind(this), this.startStreamErrorCallback);
	}

	startStreamErrorCallback(err) {
		console.error(err);
		document.getElementById('status').innerHTML = 'Not Allowed';
	}

	stopStream() {
		this.chordDetector.stopChordDetection();
		this.mic.stop();
		document.getElementById('status').innerHTML = 'Off';
	}
}
