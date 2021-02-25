class ChordDetector {
	constructor(audioContext) {
		this.audioContext = audioContext;
		this.analyzer;
		this.nextExpectedNoteEvent;
		this.isActive = false;
	}

	startChordDetection(mic) {
		this.analyzer = Meyda.createMeydaAnalyzer({
		  "audioContext": this.audioContext,
		  "source": mic.mediaStream,
		  "bufferSize": 512,
		  "featureExtractors": ["chroma"],
		  "callback": features => {
		    document.getElementById('chordMatchResult').innerHTML = features.chroma;
		  }
		});
		this.analyzer.start();
	}

	stop() {
		if (this.analyzer) this.analyzer.stop();
		this.isActive = false;
	}
}