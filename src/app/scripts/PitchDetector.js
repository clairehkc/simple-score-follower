class PitchDetector {
	constructor(audioContext) {
		this.audioContext = audioContext;
		this.modelUrl = 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/';
		this.isActive = false;
		this.pitch;
		this.nextExpectedNoteEvent;
		this.noteToFrequencyTable;

		this.frequencySet = new Set();
		this.lastSet = new Set();
		this.lastX = [];
		this.initializeNoteToFrequencyTable();
		document.getElementById("resetLog").addEventListener("click", this.resetLog.bind(this));
	}

	initializeNoteToFrequencyTable() {
		const self = this;
		fetch("./data/NoteFrequencies.json")
		.then(response => {
		   return response.json();
		})
		.then(data => self.noteToFrequencyTable = data);
	}

	startPitchDetection(mic) {
	  this.pitch = ml5.pitchDetection(this.modelUrl, this.audioContext , mic.stream, this.modelLoaded.bind(this));
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
	    this.logFrequency(frequency);
	    this.determineMatch(frequency);
	  } else {
	    document.getElementById('detectedPitchValue').innerHTML = 'No pitch detected';
	  }
	  if (this.isActive) this.getPitch();
	}

	determineMatch(detectedPitch) {
		const expectedPitch = this.noteToFrequencyTable[this.nextExpectedNoteEvent.noteEventId];
		// console.log("expectedPitch", expectedPitch, detectedPitch);
		document.getElementById('detectedPitchValue').innerHTML = detectedPitch;
		document.getElementById('expectedPitchValue').innerHTML = expectedPitch;
		// rough matching - to iterate on
		const matchResult = Math.abs(expectedPitch - detectedPitch) < 1;
		document.getElementById('pitchMatchResult').innerHTML = matchResult;		
	}

	logFrequency(frequency) {
		const estimate = Math.floor(frequency);
		this.lastX.push(estimate);
		if (this.lastX.length > 10) this.lastX.shift();

		if (this.lastX.filter(x => x === estimate).length > 5) {
			this.frequencySet.add(estimate);
			const isSetsEqual = (a, b) => a.size === b.size && [...a].every(value => b.has(value));
			if (!isSetsEqual(this.frequencySet, this.lastSet)) {
				// console.log("frequency set", this.frequencySet);
				this.lastSet = new Set(this.frequencySet);
			}
		} else {
			// console.log("heard", estimate);
		}
	}

	resetLog() {
		this.frequencySet = new Set();
		this.lastSet = new Set();
	}

	stop() {
		this.isActive = false;
	}
}