function setup() {
	const audioContext = getAudioContext();
	const audioInput = new p5.AudioIn();

	const noteEventDetector = new NoteEventDetector(audioContext, audioInput);
	const scoreParser = new ScoreParser();
	const testScorePath = "data/sample_scores/Bach_Minuet_in_G_Major_BWV_Anh._114.xml";
	scoreParser.parse(testScorePath);
}

function draw() {
  // put drawing code here
}