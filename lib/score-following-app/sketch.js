function setup() {
	const audioContext = getAudioContext();
	const audioInput = new p5.AudioIn();

	const noteEventDetector = new NoteEventDetector(audioContext, audioInput);
	// note events should be input here
}

function draw() {
  // put drawing code here
}