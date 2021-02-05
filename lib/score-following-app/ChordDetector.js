class ChordDetector {
	constructor(audioContext) {
		this.audioContext = audioContext;
		this.analyzer;
		this.nextExpectedNoteEvent;
	}

	startChordDetection(mic) {
		this.analyzer = Meyda.createMeydaAnalyzer({
		  "audioContext": this.audioContext,
		  "source": mic.mediaStream,
		  "bufferSize": 512,
		  "featureExtractors": ["chroma"],
		  "callback": features => {
		    document.getElementById('result').innerHTML = features.chroma;
		  }
		});
		this.analyzer.start();
	}

	stop() {
		if (this.analyzer) this.analyzer.stop();
	}
}