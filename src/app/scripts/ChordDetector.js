class ChordDetector {
	constructor(audioContext, logTable) {
		this.audioContext = audioContext;
		this.analyzer;
		this.nextExpectedNoteEvent;
		this.isActive = false;
		this.chordToTemplateTable = {};
		this.templateToChordTable = {};
		this.templates = [];
		this.logTable = logTable;

		this.initializeChordToTemplateTable();
	}

	initializeChordToTemplateTable() {
		const self = this;
		fetch("./data/ChordTemplates.json")
		.then(response => {
		   return response.json();
		})
		.then(data => {
			self.chordToTemplateTable = data
			for (const [key, value] of Object.entries(data)) {
			  self.templateToChordTable[value] = key;
			}
			self.templates = Object.keys(data).map((template) => data[template]);
		});
	}

	startChordDetection(mic) {
		this.analyzer = Meyda.createMeydaAnalyzer({
		  "audioContext": this.audioContext,
		  "source": mic.mediaStream,
		  "bufferSize": 512,
		  "featureExtractors": ["chroma"],
		  "callback": features => this.getChordCallback(features)
		});
		this.analyzer.start();
	}

	getChordCallback(features) {
		const expectedChord = this.getChordForNoteEvent(this.nextExpectedNoteEvent.noteEventId);
		document.getElementById('expectedChordValue').innerHTML = expectedChord;
		const matchResult = this.determineMatch(expectedChord, features.chroma);
	}

	determineMatch(expectedChord, detectedChroma) {
		if (this.isZeroVector(detectedChroma)) return;
		const templateGuess = this.guessTemplateForDetectedChroma(detectedChroma);
		const truncatedChroma = detectedChroma.map(value => value.toFixed(2));
		document.getElementById('detectedChromaValue').innerHTML = truncatedChroma;
		const detectedChord = this.getChordWithTemplate(templateGuess);
		document.getElementById('detectedChordValue').innerHTML = detectedChord;		
		const matchResult = expectedChord === detectedChord;
		document.getElementById('chordMatchResult').innerHTML = matchResult;
		this.logResult(expectedChord, truncatedChroma, detectedChord, matchResult);
		return matchResult;
	}

	// closest chord label for the score event
	getChordForNoteEvent(noteEventId) {
		// TODO: note simiplification for complex chords
		return noteEventId;
	}

	// closest chroma template for detected chroma
	guessTemplateForDetectedChroma(detectedChroma) {
		let bestMatch;
		let bestMatchDistance = 100
		this.templates.map(template => {
			const distance = this.getVectorDistance(template, detectedChroma);
			if (distance < bestMatchDistance) {
				bestMatch = template;
				bestMatchDistance = distance;
			}
		});
		return bestMatch;
	}

	getChordWithTemplate(template) {
		return this.templateToChordTable[template];
	}

	getVectorDistance(vectorA, vectorB) {
	  return Math.sqrt(vectorA.reduce((acc, val, i) => acc + Math.pow(val - vectorB[i], 2), 0));
	}

	isZeroVector(vector) {
		return vector.every(element => element === 0);
	}

	stop() {
		if (this.analyzer) this.analyzer.stop();
		this.isActive = false;
	}

	logResult(expectedChord, detectedChroma, detectedChord, matchResult) {
		let newRow = this.logTable.addRow();
		newRow.setString('Type', 'Chord');
		newRow.setString('Expected', expectedChord);
		newRow.setString('Detected', detectedChroma.toString());
		newRow.setString('Guess', detectedChord);
		newRow.setString('Match', matchResult.toString());	
	}
}