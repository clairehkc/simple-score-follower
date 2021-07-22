class PitchDetector {
	constructor(audioContext, getRms, readyCallback, matchCallback, logTable, isUsingTestInterface) {
		this.audioContext = audioContext;
		this.modelUrl = 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/';
		this.getRms = getRms;
		this.readyCallback = readyCallback;
		this.matchCallback = matchCallback;
		this.isActive = false;
		this.isAttemptingRecovery = false;
		this.nextExpectedMonophonicSequence = [];
		this.detector;
		this.nextExpectedNoteEvent;
		this.noteToFrequencyTable = {};
		this.logTable = logTable;
		this.isUsingTestInterface = isUsingTestInterface;
		this.initializeNoteToFrequencyTable();
	}

	initializeNoteToFrequencyTable() {
		const self = this;
		fetch("././data/NoteFundamentalFrequencies.json")
		.then(response => {
		   return response.json();
		})
		.then(data => self.noteToFrequencyTable = data);
	}

	initializePitchDetector(mic) {
		this.detector = ml5.pitchDetection(this.modelUrl, this.audioContext , mic.stream, this.modelLoaded.bind(this));
	}

	startPitchDetection() {
		this.isActive = true;
		this.getPitch();
	}

	modelLoaded() {
		if (!this.isUsingTestInterface) this.readyCallback();
	}

	getPitch() {
		this.detector.getPitch(this.getPitchCallback.bind(this));
	}

	getPitchCallback(err, frequency) {
	  if (frequency && this.getRms() > 0.002) {
	  	if (this.isAttemptingRecovery && this.nextExpectedMonophonicSequence.length > 0) {
	  		console.log("isAttemptingRecovery", this.nextExpectedMonophonicSequence);
	  		// keep attempting until cleared or heard all 3 notes
				const nextExpectedMonophonicPitchEvent = this.nextExpectedMonophonicSequence[0];
				const nextExpectedMonophonicPitch = this.noteToFrequencyTable[nextExpectedMonophonicPitchEvent.noteEventString];
	  		if (!nextExpectedMonophonicPitch) {
	  			console.error("Invalid note event for pitch detector", this.nextExpectedMonophonicSequence.noteEventString);
	  			return;
	  		}
	  		
	  		const matchResult = this.determineMatch(nextExpectedMonophonicPitch, frequency);
	  		if (matchResult) this.nextExpectedMonophonicSequence.shift();
	  		
	  		if (this.nextExpectedMonophonicSequence.length === 0) {
	  			console.log("recovery success", nextExpectedMonophonicPitchEvent.scoreEventId);
	  			this.matchCallback(nextExpectedMonophonicPitchEvent.scoreEventId, true, -1); // set matchTime to -1 to override timing requirement
	  			this.stopAttemptRecovery();
	  		}
	  	}

	  	if (!this.isActive) {
	  		this.getPitch();
	  		return;
	  	}

	  	const expectedPitch = this.noteToFrequencyTable[this.nextExpectedNoteEvent.noteEventString];
	  	if (!expectedPitch) {
	  		console.error("Invalid note event for pitch detector", this.nextExpectedNoteEvent.noteEventString);
	  		return;
	  	}
	  	const matchResult = this.determineMatch(expectedPitch, frequency);
	  	this.logResult(expectedPitch, frequency, matchResult);
	  } else {
	    if (this.isUsingTestInterface) document.getElementById('detectedPitchValue').innerHTML = 'No pitch detected';
	  }
	  this.getPitch();
	}

	determineMatch(expectedPitch, detectedPitch) {
		const matchResult = Math.abs(expectedPitch - detectedPitch) < 5;
		if (this.isUsingTestInterface) {
			document.getElementById('detectedPitchValue').innerHTML = detectedPitch;
			document.getElementById('expectedPitchValue').innerHTML = expectedPitch;
			document.getElementById('pitchMatchResult').innerHTML = matchResult;	
		}

		this.matchCallback(this.nextExpectedNoteEvent.scoreEventId, matchResult, Date.now());
		// if (!matchResult) console.log("expectedPitch, detectedPitch", this.nextExpectedNoteEvent.noteEventString, expectedPitch, " | ",  detectedPitch);
		return matchResult	
	}

	startAttemptRecovery(sequence) {
		this.isAttemptingRecovery = true;
		this.nextExpectedMonophonicSequence = sequence;
	}

	stopAttemptRecovery() {
		this.isAttemptingRecovery = false;
	}

	activate() {
		this.isActive = true;
	}

	deactivate() {
		this.isActive = false;
	}

	stop() {
		this.isActive = false;
	}

	logResult(expectedPitch, frequency, matchResult) {
		let newRow = this.logTable.addRow();
		const guess = matchResult ? this.nextExpectedNoteEvent.noteEventString : "--";
		newRow.setString('Type', 'Pitch');
		newRow.setString('Input', this.nextExpectedNoteEvent.noteEventString);
		newRow.setString('Expected', expectedPitch.toString());
		newRow.setString('Detected', frequency.toString());
		newRow.setString('Guess', guess);
		newRow.setString('Match', matchResult.toString());	
	}
}