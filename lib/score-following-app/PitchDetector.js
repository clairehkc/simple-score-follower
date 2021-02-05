class PitchDetector {
	constructor(audioContext) {
		this.audioContext = audioContext;
		this.modelUrl = 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/';
		this.isActive = false;
		this.pitch;
		this.nextExpectedNoteEvent;

		this.frequencySet = new Set();
		this.lastSet = new Set();
		this.lastX = [];

		document.getElementById("clear").addEventListener("click", this.clearLog.bind(this));
	}

	startPitchDetection(mic) {
	  this.pitch = ml5.pitchDetection(this.modelUrl, this.audioContext , mic.stream, this.modelLoaded.bind(this));
		document.getElementById('status').innerHTML = 'On';
		this.isActive = true;
	}

	modelLoaded() {
	  this.getPitch();
	}

	getPitch() {
		this.pitch.getPitch(this.getPitchCallback.bind(this));
	}

	getPitchCallback(err, frequency) {
	  if (frequency) {
	    document.getElementById('result').innerHTML = frequency;
	    this.logFrequency(frequency);
	  } else {
	    document.getElementById('result').innerHTML = 'No pitch detected';
	  }
	  if (this.isActive) this.getPitch();
	}

	logFrequency(frequency) {
		console.log("this.nextExpectedNoteEvent", this.nextExpectedNoteEvent);
		const estimate = Math.floor(frequency);
		this.lastX.push(estimate);
		if (this.lastX.length > 10) this.lastX.shift();

		if (this.lastX.filter(x => x === estimate).length > 5) {
			this.frequencySet.add(estimate);
			const isSetsEqual = (a, b) => a.size === b.size && [...a].every(value => b.has(value));
			if (!isSetsEqual(this.frequencySet, this.lastSet)) {
				console.log("frequency set", this.frequencySet);
				this.lastSet = new Set(this.frequencySet);
			}
		} else {
			console.log("heard", estimate);
		}
	}

	clearLog() {
		this.frequencySet = new Set();
		this.lastSet = new Set();
	}

	stop() {
		this.isActive = false;
	}
}