class ChordDetector {
	constructor(audioContext, setRms, matchCallback, logTable, isUsingTestInterface) {
		this.audioContext = audioContext;
		this.setRms = setRms;
		this.matchCallback = matchCallback;
		this.analyzer;
		this.nextExpectedNoteEvent;
		this.isActive = false;
		this.chordToTemplateTable = {};
		this.templateToChordTable = {};
		this.templates = [];
		this.lastChromas = [];
		this.logTable = logTable;
		this.isUsingTestInterface = isUsingTestInterface;

		if (this.isUsingTestInterface) {
			this.initializeChordToTemplateTable();
			this.chordDetectionType = "TEMPLATE";
			const chordDetectionTypeInputs = document.getElementsByName("chordDetectionTypeInput");
			chordDetectionTypeInputs.forEach(input => input.addEventListener('change', (event) => {
			  this.chordDetectionType = event.target.value;
			}));
		}
		this.pitchClasses = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
	}

	initializeChordToTemplateTable() {
		const self = this;
		fetch("././data/ChordTemplates.json")
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

	initializeAnalyzer(mic) {
		this.analyzer = Meyda.createMeydaAnalyzer({
		  "audioContext": this.audioContext,
		  "source": mic.mediaStream,
		  "bufferSize": 512,
		  "featureExtractors": ["chroma", "rms"],
		  "callback": features => this.getChordCallback(features)
		});
	}

	startChordDetection() {
		if (!this.analyzer) {
			console.error("Chord detector is not running");
			return;
		}
		this.analyzer.start();
	}

	getChordCallback(features) {
		this.setRms(features.rms);
		if (!this.isActive) return;
		
		let expectedChord = this.nextExpectedNoteEvent.noteEventString;
		if (this.isUsingTestInterface) {
			if (this.chordDetectionType === "TEMPLATE") expectedChord = this.getChordForNoteEvent(this.nextExpectedNoteEvent);
			document.getElementById('expectedChordValue').innerHTML = expectedChord;
		}
		
		if (features.rms < 0.03) return; // loudness
		if (!expectedChord) console.error("Invalid note event for chord detector");
		if (this.isUsingTestInterface && this.chordDetectionType === "TEMPLATE") {
			this.determineMatchTemplate(expectedChord, features.chroma);
		} else {
			this.determineMatch(features.chroma);
		}
	}

	// ** template matching
	determineMatchTemplate(expectedChord, detectedChroma) {
		if (this.isZeroVector(detectedChroma)) return;
		const chordGuessList = this.getChordGuessForDetectedChroma(detectedChroma, 10);
		const bestGuess = chordGuessList[0];
		// if expectedChord is found in the top n guesses, consider it a match
		const matchInGuesses = chordGuessList.find(guess => guess.label === expectedChord);
		const detectedChord = matchInGuesses && matchInGuesses.label || bestGuess.label;
		let matchResult = expectedChord === detectedChord;

		const truncatedChroma = detectedChroma.map(value => value.toFixed(2));

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
				console.log("no matching peak found");
			}
		}

		if (this.isUsingTestInterface) {
			document.getElementById('detectedChromaValue').innerHTML = truncatedChroma;
			document.getElementById('detectedChordValue').innerHTML = detectedChord;
			document.getElementById('chordMatchResult').innerHTML = matchResult;
		}

		this.matchCallback(this.nextExpectedNoteEvent.scoreEventId, matchResult, Date.now());

		// if (!matchResult) console.log("expectedChord, detectedChord", expectedChord, " | ", detectedChord);
		this.logResultTemplate(expectedChord, truncatedChroma, detectedChord, matchResult);
		return matchResult;
	}

	// ** checking approx peaks
	determineMatchPeaks(detectedChroma) {
		if (this.isZeroVector(detectedChroma)) return;
		// console.log("detectedChroma", detectedChroma.map(chroma => this.pitchClasses[detectedChroma.indexOf(chroma)] + ": " + chroma));
		const expectedNotes = [...new Set(this.nextExpectedNoteEvent.keys)];
		const expectedIndices = expectedNotes.map(note => this.pitchClasses.indexOf(note));
		const expectedIndicesAndNeighbors = expectedIndices.slice();
		// console.log("expectedIndices", expectedIndices);
		const groups = [];
		for (let i = 0; i < expectedIndices.length; i++) {
			const expectedIndex = expectedIndices[i];
			const leftNeighborIndex = (expectedIndex > 0) ? (expectedIndex - 1) : 11;
			const rightNeighborIndex = (expectedIndex < 11) ? (expectedIndex + 1) : 0;
			if (!expectedIndicesAndNeighbors.includes(leftNeighborIndex)) expectedIndicesAndNeighbors.push(leftNeighborIndex);
			if (!expectedIndicesAndNeighbors.includes(rightNeighborIndex)) expectedIndicesAndNeighbors.push(rightNeighborIndex);
			groups.push([leftNeighborIndex, expectedIndex, rightNeighborIndex]);
		}
		// console.log("expectedIndicesAndNeighbors", expectedIndicesAndNeighbors);

		const chromaAtExpectedIndices = expectedIndicesAndNeighbors.map(index => detectedChroma[index]);
		// console.log("chromaAtExpectedIndices", chromaAtExpectedIndices);
		const proTotal = chromaAtExpectedIndices.reduce((a, b) => a + b, 0);
		const proAverage = proTotal / expectedIndicesAndNeighbors.length;

		const groupAverages = groups.map(group => {
			const groupChroma = group.map(index => detectedChroma[index]);
			const groupTotal = groupChroma.reduce((a, b) => a + b, 0);
			return groupTotal / group.length;
		});
		// console.log("groupAverages", groupAverages);

		const unexpectedIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].filter(index => !expectedIndicesAndNeighbors.includes(index));
		// console.log("unexpectedIndices", unexpectedIndices);
		
		let matchResult;
		const proAverageRequirement = 0.7;

		matchResult = (proAverage > proAverageRequirement) && groupAverages.every(average => average > proAverage - 0.2);

		if (unexpectedIndices.length !== 0) {
			const chromaAtUnexpectedIndices = unexpectedIndices.map(index => detectedChroma[index]);
			const conTotal = chromaAtUnexpectedIndices.reduce((a, b) => a + b, 0);
			const conAverage = conTotal / unexpectedIndices.length;
			// console.log("avg compare diff", proAverage, conAverage, proAverage - conAverage);
			// matchResult = (proAverage > conAverage) && (proAverage > 0.80) && (conAverage < 0.75);
			matchResult = matchResult && (proAverage > conAverage);
		}

		const chromaLabels = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
		const truncatedChroma = detectedChroma.map((value, index) => chromaLabels[index] + ": " + value.toFixed(2));

		this.matchCallback(this.nextExpectedNoteEvent.scoreEventId, matchResult, Date.now());
		// if (!matchResult) console.log("expectedChord, detectedChord", expectedChord, " | ", detectedChord);

		if (this.isUsingTestInterface) {
			document.getElementById('detectedChromaValue').innerHTML = truncatedChroma;
			document.getElementById('chordMatchResult').innerHTML = matchResult;
		}

		this.logResult(this.nextExpectedNoteEvent.noteEventString, truncatedChroma, matchResult);
		return matchResult;
	}

	// ** checking expected peaks for high energy across X samples
	determineMatch(detectedChroma) {
		if (this.isZeroVector(detectedChroma)) return;
		// console.log("detectedChroma", detectedChroma.map(chroma => this.pitchClasses[detectedChroma.indexOf(chroma)] + ": " + chroma));
		const sampleSize = 10;
		const expectedNotes = [...new Set(this.nextExpectedNoteEvent.keys)];
		const expectedIndices = expectedNotes.map(note => this.pitchClasses.indexOf(note));
		const chromaAtExpectedIndices = expectedIndices.map(index => detectedChroma[index]);
		this.lastChromas.push(detectedChroma);
		if (this.lastChromas.length < sampleSize) return;

		const filteredLastChromas = this.lastChromas.map(chromaArray => expectedIndices.map(index => chromaArray[index]));

		const averageChromaAtExpectedIndices = [];
		for (let i = 0; i < expectedIndices.length; i++) {
			const sum = filteredLastChromas.reduce((a, b) => {
				return a + b[i];
			}, 0);
			averageChromaAtExpectedIndices.push(sum / sampleSize);
		}
		// console.log("averages", averageChromaAtExpectedIndices);
		const matchResult = (averageChromaAtExpectedIndices.filter(value => value > 0.9).length >= 1) &&
			(averageChromaAtExpectedIndices.filter(value => value > 0.5).length >= expectedIndices.length - 1);

		const chromaLabels = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
		const truncatedChroma = detectedChroma.map((value, index) => chromaLabels[index] + ": " + value.toFixed(2));

		this.matchCallback(this.nextExpectedNoteEvent.scoreEventId, matchResult, Date.now());

		if (this.isUsingTestInterface) {
			document.getElementById('detectedChromaValue').innerHTML = truncatedChroma;
			document.getElementById('chordMatchResult').innerHTML = matchResult;
		}

		this.logResult(this.nextExpectedNoteEvent.noteEventString, truncatedChroma, matchResult);
		this.lastChromas = [];
		return matchResult;
	}

	// determines the closest chord label for the score event
	getChordForNoteEvent(noteEvent) {
		const keys = noteEvent.keys;
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

	activate() {
		this.isActive = true;
	}

	deactivate() {
		this.isActive = false;
	}

	stop() {
		if (this.analyzer) this.analyzer.stop();
		this.isActive = false;
	}

	logResultTemplate(expectedChord, detectedChroma, detectedChord, matchResult) {
		let newRow = this.logTable.addRow();
		newRow.setString('Type', 'Chord Template');
		newRow.setString('Input', this.nextExpectedNoteEvent.noteEventString);
		newRow.setString('Expected', expectedChord);
		newRow.setString('Detected', detectedChroma.toString());
		newRow.setString('Guess', detectedChord);
		newRow.setString('Match', matchResult.toString());	
	}

	logResult(detectedChroma, matchResult) {
		let newRow = this.logTable.addRow();
		newRow.setString('Type', 'Chord Peak');
		newRow.setString('Input', this.nextExpectedNoteEvent.noteEventString);
		newRow.setString('Detected', detectedChroma.toString());
		newRow.setString('Match', matchResult.toString());	
	}
}