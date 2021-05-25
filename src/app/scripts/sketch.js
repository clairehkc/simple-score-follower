function setup() {
	const audioContext = getAudioContext();
	const audioInput = new p5.AudioIn();

	const noteEventDetector = new NoteEventDetector(audioContext, audioInput);
	document.getElementById("scoreUploadButton").addEventListener("click", () => scoreInput.click());
	scoreInput.addEventListener("change", this.uploadScore.bind(this));
}

function uploadScore() {
	const reader = new FileReader();

	const onUploadScore = (xmlDoc) => {
		this.renderScore(xmlDoc);
	}

	const onFileLoad = (event) => {
		const domParser = new DOMParser();
		const xmlDoc = domParser.parseFromString(reader.result, "text/xml");
		onUploadScore(xmlDoc);
	};

	reader.onload = onFileLoad;
	const scoreInput = document.getElementById("scoreInput");
	reader.readAsText(scoreInput.files[0]);
}

function renderScore(xmlDoc) {
	const scoreContainer = document.getElementById("scoreContainer");
	const osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(scoreContainer);
	const loadPromise = osmd.load(xmlDoc);

	loadPromise.then(() => {
	  osmd.render();
	  // osmd.cursor.show();

	  const scoreParser = new ScoreParser();
	  const result = scoreParser.parse(osmd);
	});
}

function draw() {
  // put drawing code here
}