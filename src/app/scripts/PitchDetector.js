class PitchDetector {
	constructor(audioContext, logTable) {
		this.audioContext = audioContext;
		this.modelUrl = 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/';
		this.isActive = false;
		this.pitchDetector;
		this.nextExpectedNoteEvent;
		this.noteToFrequencyTable = {};
		this.logTable = logTable;

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
	    this.logResult(expectedPitch, frequency, matchResult);
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

	logResult(expectedPitch, frequency, matchResult) {
		let newRow = this.logTable.addRow();
		newRow.setString('Type', 'Pitch');
		newRow.setString('Expected', expectedPitch.toString());
		newRow.setString('Detected', frequency.toString());
		newRow.setString('Guess', '');
		newRow.setString('Match', matchResult.toString());	
	}
}