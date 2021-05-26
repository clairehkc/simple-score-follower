let osmd;
let noteEventDetector;
let scoreParser;
let scoreEventList = [];
let currentScoreIndex = 0;

function setup() {
	const audioContext = getAudioContext();
	const audioInput = new p5.AudioIn();

	noteEventDetector = new NoteEventDetector(audioContext, audioInput, onFoundMatch);
	if (noteEventDetector.isUsingTestInterface) return;

	scoreParser = new ScoreParser();

	const scoreInput = document.getElementById("scoreInput");
	document.getElementById("scoreUploadButton").addEventListener("click", () => scoreInput.click());
	document.getElementById("skipEvent").addEventListener("click", skipEvent);
	document.getElementById("resetCursor").addEventListener("click", resetCursor);
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
	osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(scoreContainer);
	const loadPromise = osmd.load(xmlDoc);

	loadPromise.then(() => {
	  osmd.render();
	  scoreEventList = scoreParser.parse(osmd);
	  osmd.cursor.reset();
	  osmd.cursor.show();

	  const currentScoreEvent = scoreEventList[currentScoreIndex];
	  noteEventDetector.setNextExpectedNoteEvent(currentScoreEvent.noteEventString, currentScoreEvent.scoreEventId);
		noteEventDetector.startStream();
	});
}

function onFoundMatch(scoreEventId) {
	if (scoreEventId === currentScoreIndex) {
		currentScoreIndex++;
		const currentScoreEvent = scoreEventList[currentScoreIndex];
		noteEventDetector.setNextExpectedNoteEvent(currentScoreEvent.noteEventString, currentScoreEvent.scoreEventId);
		osmd.cursor.next();
	} else {
		console.error("Received out of order match response from NoteEventDetector");
	}
}

function skipEvent() {
	onFoundMatch(currentScoreIndex);
}

function resetCursor() {
	osmd.cursor.reset();
	currentScoreIndex = 0;
	const currentScoreEvent = scoreEventList[currentScoreIndex];
	noteEventDetector.setNextExpectedNoteEvent(currentScoreEvent.noteEventString, currentScoreEvent.scoreEventId);
}

function draw() {
}