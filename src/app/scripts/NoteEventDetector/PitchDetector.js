class PitchDetector {
	constructor(audioContext, getRms, readyCallback, matchCallback, logTable, isUsingTestInterface) {
		this.audioContext = audioContext;
		this.modelUrl = 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/';
		this.getRms = getRms;
		this.readyCallback = readyCallback;
		this.matchCallback = matchCallback;
		this.isActive = false;
		this.isAttemptingRecovery = false;
		this.recoveryMatchCount = 0;
		this.lastMatchNoteEvent = undefined;
		this.nextExpectedMonophonicSequence;
		this.isMonophonicPiece;
		this.detector;
		this.nextExpectedNoteEvent;
		this.noteToFrequencyTable = {};
		this.logTable = logTable;
		this.isUsingTestInterface = isUsingTestInterface;
		this.initializeNoteToFrequencyTable();
	}

	initializeNoteToFrequencyTable() {
		const self = this;
		fetch("src/app/data/NoteFundamentalFrequencies.json")
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
		if (!this.detector) {
			console.error("Pitch detector is not running");
			return;
		}
		this.detector.getPitch(this.getPitchCallback.bind(this));
	}

	getPitchCallback(err, frequency) {
	  if (frequency && this.getRms() > 0.002) {
	  	if (this.isAttemptingRecovery && this.nextExpectedMonophonicSequence && this.nextExpectedMonophonicSequence.length > 0) {
	  		// keep attempting until match or matched 3 future notes
	  		let lastMatchNoteEventId;
	  		const nextExpectedMonophonicPitches = this.nextExpectedMonophonicSequence.map(noteEvent => this.noteToFrequencyTable[noteEvent.noteEventString]);
	  		for (let i = 0; i < nextExpectedMonophonicPitches.length; i++) {
	  			const noteEvent = this.nextExpectedMonophonicSequence[i];
	  			if (this.lastMatchNoteEvent && this.lastMatchNoteEvent.noteEventString === noteEvent.noteEventString) continue;

	  			if (!nextExpectedMonophonicPitches[i]) {
	  				console.error("Invalid note event for pitch detector", noteEvent.noteEventString);
	  				return;
	  			}	  			

	  			const recoveryMatchResult = this.determineMatch(nextExpectedMonophonicPitches[i], frequency, true);
	  			if (recoveryMatchResult) {
	  				this.lastMatchNoteEvent = noteEvent;
	  				lastMatchNoteEventId = noteEvent.scoreEventId;
	  				this.nextExpectedMonophonicSequence.splice(i, 1);
	  				this.recoveryMatchCount++;
	  				break;
	  			}
	  		}

	  		if (this.recoveryMatchCount === 3) {
	  			console.log("recoveryAccept", lastMatchNoteEventId);
	  			this.matchCallback(lastMatchNoteEventId, true, -1); // set matchTime to -1 to override timing requirement
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

	determineMatch(expectedPitch, detectedPitch, isAttemptingRecovery = false) {
		const pitchDifferenceAllowance = !this.isUsingTestInterface && this.isMonophonicPiece ? 15 : 5;
		const matchResult = Math.abs(expectedPitch - detectedPitch) < pitchDifferenceAllowance;
		if (this.isUsingTestInterface) {
			document.getElementById('detectedPitchValue').innerHTML = detectedPitch;
			document.getElementById('expectedPitchValue').innerHTML = expectedPitch;
			document.getElementById('pitchMatchResult').innerHTML = matchResult;	
		}

		if (!isAttemptingRecovery) this.matchCallback(this.nextExpectedNoteEvent.scoreEventId, matchResult, Date.now());
		// if (!matchResult) console.log("expectedPitch, detectedPitch", this.nextExpectedNoteEvent.noteEventString, expectedPitch, " | ",  detectedPitch);
		return matchResult	
	}

	startAttemptRecovery(sequence) {
		this.isAttemptingRecovery = true;
		this.nextExpectedMonophonicSequence = sequence;
	}

	stopAttemptRecovery() {
		this.isAttemptingRecovery = false;
		this.nextExpectedMonophonicSequence = undefined;
		this.recoveryMatchCount = 0;
		this.lastMatchNoteEvent = undefined;
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