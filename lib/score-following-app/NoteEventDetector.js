class NoteEventDetector {
	constructor() {
		this.audioContext;
		this.mic;
		this.pitch;
		this.modelUrl = 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/';
		this.frequencySet = new Set();
		this.lastSet = new Set();
		this.lastX = [];
		console.log("NoteEventDetector created");
	}

	init() {
		console.log("init");
	  noCanvas();
	  this.audioContext = getAudioContext();
	  this.mic = new p5.AudioIn();

	  document.getElementById("start").addEventListener("click", this.startStream.bind(this));
	  document.getElementById("stop").addEventListener("click", this.stopStream.bind(this));
	  document.getElementById("clear").addEventListener("click", this.clearLog.bind(this));
	}

	startStream() {
		this.mic.start(this.startPitchDetection.bind(this));
		document.getElementById('status').innerHTML = 'On';
	}

	stopStream() {
		this.mic.stop();
		document.getElementById('status').innerHTML = 'Off';
	}

	startPitchDetection() {
	  console.log("start");
	  this.pitch = ml5.pitchDetection(this.modelUrl, this.audioContext , this.mic.stream, this.modelLoaded.bind(this));
	}

	modelLoaded() {
	  console.log("load");
	  this.getPitch();
	}

	getPitch() {
		this.pitch.getPitch(this.getPitchCallback.bind(this));
	}

	getPitchCallback(err, frequency) {
	  if (frequency) {
	    document.getElementById('result').innerHTML = frequency;
	    this.logFrequency(frequency);
	  } else {
	    document.getElementById('result').innerHTML = 'No pitch detected';
	  }
	  this.getPitch();
	}

	logFrequency(frequency) {
		const estimate = Math.floor(frequency);
		this.lastX.push(estimate);
		if (this.lastX.length > 10) this.lastX.shift();

		if (this.lastX.filter(x => x === estimate).length > 5) {
			this.frequencySet.add(estimate);
			const isSetsEqual = (a, b) => a.size === b.size && [...a].every(value => b.has(value));
			if (!isSetsEqual(this.frequencySet, this.lastSet)) {
				console.log("frequency set", this.frequencySet);
				this.lastSet = new Set(this.frequencySet);
			}
		} else {
			console.log("heard", estimate);
		}
	}

	clearLog() {
		this.frequencySet = new Set();
		this.lastSet = new Set();
	}	
}
