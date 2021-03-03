class PitchDetector {
	constructor(audioContext, logOutput) {
		this.audioContext = audioContext;
		this.modelUrl = 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/';
		this.isActive = false;
		this.pitchDetector;
		this.nextExpectedNoteEvent;
		this.noteToFrequencyTable = {};
		this.logOutput = logOutput;

		this.frequencySet = new Set();
		this.lastSet = new Set();
		this.lastX = [];
		this.initializeNoteToFrequencyTable();
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
	  this.pitchDetector = ml5.pitchDetection(this.modelUrl, this.audioContext , mic.stream, this.modelLoaded.bind(this));
		this.isActive = true;
	}

	modelLoaded() {
	  this.getPitch();
	}

	getPitch() {
		this.pitchDetector.getPitch(this.getPitchCallback.bind(this));
	}

	getPitchCallback(err, frequency) {
	  if (frequency) {
	    const expectedPitch = this.noteToFrequencyTable[this.nextExpectedNoteEvent.noteEventId];
	    const matchResult = this.determineMatch(expectedPitch, frequency);
	    this.formatForLog(expectedPitch, frequency, matchResult);
	  } else {
	    document.getElementById('detectedPitchValue').innerHTML = 'No pitch detected';
	  }
	  if (this.isActive) this.getPitch();
	}

	determineMatch(expectedPitch, detectedPitch) {
		document.getElementById('detectedPitchValue').innerHTML = detectedPitch;
		document.getElementById('expectedPitchValue').innerHTML = expectedPitch;
		// rough matching - to iterate on
		const matchResult = Math.abs(expectedPitch - detectedPitch) < 1;
		document.getElementById('pitchMatchResult').innerHTML = matchResult;	
		return matchResult	
	}

	stop() {
		this.isActive = false;
	}

	formatForLog(expectedPitch, frequency, matchResult) {
		const stringToLog = "Expected Pitch: " + expectedPitch + " | " +
			"Detected Pitch: " + frequency + " | " +
			"Match: " + matchResult + '\n';
		this.logOutput.push(stringToLog);
	}
}