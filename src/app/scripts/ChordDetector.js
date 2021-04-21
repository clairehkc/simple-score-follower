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
		  "featureExtractors": ["chroma", "rms"],
		  "callback": features => this.getChordCallback(features)
		});
		this.analyzer.start();
	}

	getChordCallback(features) {
		const expectedChord = this.getChordForNoteEvent(this.nextExpectedNoteEvent);
		if (!expectedChord) console.error("Invalid note event for chord detector");
		document.getElementById('expectedChordValue').innerHTML = expectedChord;
		if (features.rms < 0.02) return; // loudness - can iterate on this to filter out overtones
		const matchResult = this.determineMatch(expectedChord, features.chroma);
	}

	determineMatch(expectedChord, detectedChroma) {
		if (this.isZeroVector(detectedChroma)) return;
		const chordGuessList = this.getChordGuessForDetectedChroma(detectedChroma, 2);
		const bestGuess = chordGuessList[0];
		// if expectedChord is found in the top n guesses, consider it a match
		const matchInGuesses = chordGuessList.find(guess => guess.label === expectedChord);
		const detectedChord = matchInGuesses && matchInGuesses.label || bestGuess.label;
		let matchResult = expectedChord === detectedChord;

		const truncatedChroma = detectedChroma.map(value => value.toFixed(2));
		document.getElementById('detectedChromaValue').innerHTML = truncatedChroma;
		document.getElementById('detectedChordValue').innerHTML = detectedChord;

		if (matchResult) {
			// filter out results without a matching peak with the expected chord
			const expectedTemplate = this.chordToTemplateTable[expectedChord];
			const expectedPeakIndices = [];
			for (let i = 0; i < expectedTemplate.length; i++) {
				if (expectedTemplate[i] === 1) expectedPeakIndices.push(i);
			}
			const sortedChroma = detectedChroma.slice().sort();
			const detectedPeakIndices = sortedChroma.slice(9, 12).map(val => detectedChroma.indexOf(val)).sort();
			const hasMatchingPeak = expectedPeakIndices.find(peakIndex => detectedPeakIndices.includes(peakIndex));
			if (!hasMatchingPeak) {
				matchResult = false;
				console.info("non matching peak");
			}
		}

		document.getElementById('chordMatchResult').innerHTML = matchResult;
		this.logResult(expectedChord, truncatedChroma, detectedChord, matchResult);
		return matchResult;
	}

	// determines the closest chord label for the score event
	getChordForNoteEvent(noteEvent) {
		const keys = noteEvent.keys;
		const noteEventId = noteEvent.noteEventId;
		const chordIncludesSharps = keys.slice(0, 3).find(key => key.includes("#"));
		// order chord labels by prioritizing chords with matching root notes and accidentals
		// prioritize chords with/without sharps based on whether or not the lower three notes of the event include sharps
		let chordLabels = Object.keys(this.chordToTemplateTable).sort((a, b) => { 
			if (b.startsWith(keys[0])) {
				if (a.startsWith(keys[0])) {
					if (chordIncludesSharps) {
						return (b.includes("#")) ? 1 : -1;
					} else {
						return (!b.includes("#")) ? 1 : -1;
					}
				}
				return 1;
			} else {
				if (!a.startsWith(keys[0])) {
					if (chordIncludesSharps) {
						return (b.includes("#")) ? 1 : -1;
					} else {
						return (!b.includes("#")) ? 1 : -1;
					}
				}
				return -1;
			} 
		});
		// still need to convert B#s to Cs, etc
		return this.getChordForNoteEventHelper(keys.slice(), chordLabels);
	}

	getChordForNoteEventHelper(keys, chordLabels) {
		let matchedChord;
		if (keys.length === 2) {
			if (keys[0] === keys[1]) {
				// match octave to the major/minor chord with a matching root note
				// i.e. C-C -> C-E-G
				matchedChord = chordLabels.find(label => label.startsWith(keys[0]));
				if (matchedChord) return matchedChord;
			}
			// match adjacent note subset of a major/minor chord to its superset chord
			// i.e. C-E -> C-E-G, E-G -> E-G-B
			matchedChord = chordLabels.find(label => label.includes(keys[0] + "-" + keys[1]));
			if (matchedChord) return matchedChord;

			// match inverted adjacent note subset of a major/minor chord to the superset chord of its inversion
			// i.e. G-E -> E-G-B
			matchedChord = chordLabels.find(label => label.includes(keys[1] + "-" + keys[0]));
			if (matchedChord) return matchedChord;

			// match non-adjacent note subset including its inversion to the major/minor chord with matching root and high note
			// i.e. E-B -> E-G-B, B-E -> E-G-B
			matchedChord = chordLabels.find(label => label.includes(keys[0]) && label.includes(keys[1]));
			if (matchedChord) return matchedChord;

			// if none of these conditions are met, match to the major/minor chord with a matching root note
			// i.e. C-B -> C-E-G
			return chordLabels.find(label => label.startsWith(keys[0]));
		} else if (keys.length === 3) {
			// chord is a major/minor chord, return its label
			matchedChord = chordLabels.find(label => label === keys[0] + "-" + keys[1] + "-" + keys[2]);
			if (matchedChord) return matchedChord;

			// check if either of its inversions are a major/minor chord
			// i.e. for E-G-C, check G-C-E, C-E-G
			matchedChord = chordLabels.find(label => label === keys[1] + "-" + keys[2] + "-" + keys[0]);
			if (matchedChord) return matchedChord;
			matchedChord = chordLabels.find(label => label === keys[2] + "-" + keys[0] + "-" + keys[1]);
			if (matchedChord) return matchedChord;

			// if not, remove the high note and recurse
			keys.pop();
			return this.getChordForNoteEventHelper(keys, chordLabels);
		} else {
			// remove the high note and recurse
			keys.pop();
			return this.getChordForNoteEventHelper(keys, chordLabels);
		}
	}

	// determines the closest chroma template for detected chroma
	// rank top n matches in ascending distance
	getChordGuessForDetectedChroma(detectedChroma, guesses = 1) {
		let topMatchList = [];
		for (let i = 0; i < guesses; i++) {
			topMatchList[i] = { label: "", distance: 100 };
		}

		this.templates.map(template => {
			const distance = this.getVectorDistance(template, detectedChroma);
			let newTopMatch;
			let newTopMatchIndex;
			for (let i = guesses - 1; i >= 0; i--) {
				const currentTopMatch = topMatchList[i];
				if (distance < currentTopMatch.distance) {
					newTopMatch = { label: this.getChordWithTemplate(template), distance };
					newTopMatchIndex = i;
				} else {
					break;
				}
			}
			if (newTopMatch) topMatchList[newTopMatchIndex] = newTopMatch;
		});
		return topMatchList;
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
		newRow.setString('Input', this.nextExpectedNoteEvent.noteEventString);
		newRow.setString('Expected', expectedChord);
		newRow.setString('Detected', detectedChroma.toString());
		newRow.setString('Guess', detectedChord);
		newRow.setString('Match', matchResult.toString());	
	}
}