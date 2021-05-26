let noteEventDetector;
let scoreParser;
let scoreEventList = [];

function setup() {
	const audioContext = getAudioContext();
	const audioInput = new p5.AudioIn();

	noteEventDetector = new NoteEventDetector(audioContext, audioInput);
	scoreParser = new ScoreParser();
	scoreEventList = [];

	document.getElementById("scoreUploadButton").addEventListener("click", () => scoreInput.click());
	document.getElementById("skipEvent").addEventListener("click", skipEvent);
	scoreInput.addEventListener("change", uploadScore);
}

function uploadScore() {
	const reader = new FileReader();

	const onUploadScore = (xmlDoc) => {
		renderScore(xmlDoc);
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
	  scoreEventList = scoreParser.parse(osmd);
	  osmd.cursor.reset();
	  osmd.cursor.show();
	});
}

function skipEvent() {

}

function draw() {
}