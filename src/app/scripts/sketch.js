function setup() {
	const audioContext = getAudioContext();
	const audioInput = new p5.AudioIn();

	const noteEventDetector = new NoteEventDetector(audioContext, audioInput);
	const scoreInput = document.getElementById("scoreInput");
	document.getElementById("scoreUploadButton").addEventListener("click", () => scoreInput.click());
	scoreInput.addEventListener("change", this.uploadScore);
}

function uploadScore() {
	const reader = new FileReader();

	const scoreParserCallback = (result) => {
		console.log("scoreParserCallback", result);
	}

	const onLoad = (event) => {
		const scoreParser = new ScoreParser();
		const result = scoreParser.parse(reader.result);
		scoreParserCallback(result);
	};

	reader.onload = onLoad;
	reader.readAsText(this.files[0]);
}

function draw() {
  // put drawing code here
}