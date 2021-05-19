function setup() {
	const audioContext = getAudioContext();
	const audioInput = new p5.AudioIn();

	const noteEventDetector = new NoteEventDetector(audioContext, audioInput);
	document.getElementById("scoreUploadButton").addEventListener("click", () => scoreInput.click());
	scoreInput.addEventListener("change", this.uploadScore.bind(this));
}

function uploadScore() {
	const reader = new FileReader();

	const scoreParserCallback = (xmlDoc, data) => {
		console.log("scoreParserCallback", xmlDoc, data);
		this.renderScore(xmlDoc);
	}

	const onLoad = (event) => {
		const scoreParser = new ScoreParser();
		const xmlDoc = scoreParser.parse(reader.result);
		scoreParserCallback(xmlDoc, scoreParser.measures);
	};

	reader.onload = onLoad;
	const scoreInput = document.getElementById("scoreInput");
	reader.readAsText(scoreInput.files[0]);
}

function renderScore(xmlDoc) {
	const scoreContainer = document.getElementById("scoreContainer");
	const osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(scoreContainer);
	const loadPromise = osmd.load(xmlDoc);

	loadPromise.then(() => {
	  osmd.render();
	});
}

function draw() {
  // put drawing code here
}