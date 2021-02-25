class ChordDetector {
	constructor(audioContext) {
		this.audioContext = audioContext;
		this.analyzer;
		this.nextExpectedNoteEvent;
		this.isActive = false;
		this.chordToTemplateTable;

		this.initializeChordToTemplateTable();
	}

	initializeChordToTemplateTable() {
		const self = this;
		fetch("./data/ChordTemplates.json")
		.then(response => {
		   return response.json();
		})
		.then(data => self.chordToTemplateTable = data);
		// stringify arrays and reverse dictionary as well
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
		// document.getElementById('expectedChordValue').innerHTML = features.chroma;
		document.getElementById('detectedChromaValue').innerHTML = features.chroma;
		this.determineMatch(features.chroma);
	}

	determineMatch(detectedChroma) {
		const nextExpectedNoteEventChord = this.getChordForNoteEvent(this.nextExpectedNoteEvent.noteEventId);
		const detectedTemplate = this.getTemplateForDetectedChroma(detectedChroma);
		const detectedChord = this.getChordWithTemplate(detectedTemplate);
		const matchResult = nextExpectedNoteEventChord === detectedChord;
		document.getElementById('chordMatchResult').innerHTML = matchResult;		
	}

	getChordForNoteEvent(noteEventId) {

	}

	getTemplateForDetectedChroma(detectedChroma) {

	}

	getChordWithTemplate(template) {

	}

	stop() {
		if (this.analyzer) this.analyzer.stop();
		this.isActive = false;
	}
}