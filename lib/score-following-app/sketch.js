function setup() {
	const audioContext = getAudioContext();
	const audioInput = new p5.AudioIn();

	const noteEventDetector = new NoteEventDetector();
	noteEventDetector.init(audioContext, audioInput);
}

function draw() {
  // put drawing code here
}