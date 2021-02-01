class ChordDetector {
	constructor(audioContext, audioInput) {
		this.audioContext = audioContext;
		this.mic = audioInput;
		this.analyzer;
	}

	init() {

	}

	start() {
		this.mic.start(this.startChordDetection.bind(this));
	}

	startChordDetection() {
		this.analyzer = Meyda.createMeydaAnalyzer({
		  "audioContext": this.audioContext,
		  "source": this.mic.mediaStream,
		  "bufferSize": 512,
		  "featureExtractors": ["chroma"],
		  "callback": features => {
		    document.getElementById('result').innerHTML = features.chroma;
		  }
		});
		this.analyzer.start();
	}

	stopChordDetection() {
		this.analyzer.stop();
	}
}