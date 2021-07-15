let osmd;
let scoreContainer;
let scoreParser, noteEventDetector;
let isDetectorReady = false;
let isAttemptingRecovery = false;
let scoreEventList = [];
let currentScoreIndex = 0;
let consecutiveFalseMatches = 0;
let onScoreClickStartingPositionObjectId;
let startButton, stopButton, skipButton;

let lastMatchLength = 0;
let lastMatchAcceptTime = Date.now();

function setup() {
	const audioContext = getAudioContext();
	const audioInput = new p5.AudioIn();

	noteEventDetector = new NoteEventDetector(audioContext, audioInput, onDetectorReady, onReceiveMatchResult);
	if (noteEventDetector.isUsingTestInterface) return;

	scoreParser = new ScoreParser();

	const scoreInput = document.getElementById("scoreInput");
	scoreContainer = document.getElementById("scoreContainer");
	osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(scoreContainer);
	scoreContainer.addEventListener("click", onScoreClick);

	startButton = document.getElementById("startNoteEventDetector");
	stopButton = document.getElementById("stopNoteEventDetector");
	skipButton = document.getElementById("skipEvent");

	startButton.addEventListener("click", startStream);
	stopButton.addEventListener("click", stopStream);
	skipButton.addEventListener("click", skipEvent);

	startButton.disabled = true;
	stopButton.disabled = true;
	skipButton.disabled = true;

	document.getElementById("scoreUploadButton").addEventListener("click", () => scoreInput.click());
	document.getElementById("resetCursor").addEventListener("click", resetCursor);
	scoreInput.addEventListener("change", uploadScore);
}

function uploadScore() {
	if (noteEventDetector.streamIsActive) stopStream();
	noteEventDetector.reset();

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
	const loadPromise = osmd.load(xmlDoc);

	loadPromise.then(() => {
	  osmd.render();
	  scoreEventList = scoreParser.parse(osmd);
	  scoreEventList.forEach(scoreEvent => noteEventDetector.addNoteEvent(scoreEvent.noteEventString, scoreEvent.scoreEventId));
	  osmd.cursor.reset();
	 	observeCursor();
	  const currentScoreEvent = scoreEventList[currentScoreIndex];
	  noteEventDetector.setNextExpectedNoteEvent(currentScoreEvent.noteEventString, currentScoreEvent.scoreEventId);
	  startButton.disabled = false;
	  osmd.cursor.hide();
	});
}

function onDetectorReady() {
	if (noteEventDetector.isUsingTestInterface) return;
	isDetectorReady = true;
	osmd.cursor.show();
}

function startStream() {
	noteEventDetector.startStream();
	startButton.disabled = true;
	stopButton.disabled = false;
	skipButton.disabled = false;
}

function stopStream() {
	noteEventDetector.stopStream();
	osmd.cursor.hide();
	startButton.disabled = false;
	stopButton.disabled = true;
	skipButton.disabled = true;
}

function getNextExpectedMonophonicSequence(index) {
	if (index + 1 >= scoreEventList.length) return;
	let sequence = [];
	for (let i = index + 1; i < scoreEventList.length; i++) {
		const currentEvent = scoreEventList[i];
		if (currentEvent.numberOfNotes === 1) {
			const noteEvent = noteEventDetector.createNoteEvent(currentEvent.noteEventString, currentEvent.scoreEventId);
			sequence.push(noteEvent);
		} else {
			sequence = [];
		}
		if (sequence.length === 3) break;
	}
	return sequence;
}

function onReceiveMatchResult(scoreEventId, matchResult, matchTime) {
	if (matchTime !== -1 && ((matchTime - lastMatchAcceptTime) < lastMatchLength)) return;
	if (!matchResult) {
		if (!isAttemptingRecovery) {
			consecutiveFalseMatches++;
			console.log("consecutiveFalseMatches", consecutiveFalseMatches);
			if (consecutiveFalseMatches > 15) {
				const nextExpectedMonophonicSequence = getNextExpectedMonophonicSequence(currentScoreIndex);
				noteEventDetector.startAttemptRecovery(nextExpectedMonophonicSequence);
				isAttemptingRecovery = true;
			}
		}
		return;
	}

	consecutiveFalseMatches = 0;
	isAttemptingRecovery = false;

	if (currentScoreIndex === scoreEventList.length - 1) return;

	console.log("onReceiveMatchResult", scoreEventId, currentScoreIndex);

	if (scoreEventId === currentScoreIndex) {
		currentScoreIndex++;
		osmd.cursor.next();
	} else {
		const indexDiff = scoreEventId - currentScoreIndex;
		for (let i = 0; i < indexDiff; i++) {
			if (osmd.cursor.iterator.EndReached) break;
			currentScoreIndex++;
			osmd.cursor.next();
		}
	}
	const currentScoreEvent = scoreEventList[currentScoreIndex];

	if (currentScoreEvent.noteEventString !== "X") {
		lastMatchLength = currentScoreEvent.noteEventLength;
		lastMatchAcceptTime = matchTime;
		noteEventDetector.setNextExpectedNoteEvent(currentScoreEvent.noteEventString, currentScoreEvent.scoreEventId);
	} else {
		skipEvent();
	}
}

function skipEvent() {
	onReceiveMatchResult(currentScoreIndex, true);
}

function observeCursor() {
	const cursorElement = document.getElementById("cursorImg-0");
	const observer = new IntersectionObserver(function(entries) {
		if (!osmd.cursor.hidden && entries[0].isIntersecting === false) {
			window.scroll({
			  top: parseFloat(cursorElement.style.top) - 10,
			  behavior: 'smooth'
			});
		}
	}, { threshold: [1] });

	observer.observe(cursorElement);
}

function getOSMDCoordinates(clickLocation) {
  const sheetX = (clickLocation.x - scoreContainer.offsetLeft) / 10;
  const sheetY = (clickLocation.y - scoreContainer.offsetTop) / 10;
  return new opensheetmusicdisplay.PointF2D(sheetX, sheetY);
}

function onScoreClick(clickEvent) {
	if (!osmd || osmd.cursor.hidden) return;
  const clickLocation = new opensheetmusicdisplay.PointF2D(clickEvent.pageX, clickEvent.pageY);
  const sheetLocation = getOSMDCoordinates(clickLocation);
  const maxDist = new opensheetmusicdisplay.PointF2D(5, 5);
  const nearestNote = osmd.GraphicSheet.GetNearestNote(sheetLocation, maxDist).sourceNote;
  const nearestNoteObjectId = nearestNote.NoteToGraphicalNoteObjectId;
  if (nearestNoteObjectId) {
  	const notesUnderCursor = osmd.cursor.NotesUnderCursor();
  	onScoreClickStartingPositionObjectId = notesUnderCursor[0].NoteToGraphicalNoteObjectId;
  	updateCursorPosition(nearestNoteObjectId, true);
  }
}

function updateCursorPosition(nearestNoteObjectId, atStartingPosition = false) {
	const notesUnderCursor = osmd.cursor.NotesUnderCursor();
	const currentScoreEventObjectIds = notesUnderCursor.map(note => note.NoteToGraphicalNoteObjectId);

	if (!atStartingPosition && currentScoreEventObjectIds.includes(onScoreClickStartingPositionObjectId)) {
		console.error("No matching note found");
		return;
	}

	if (currentScoreEventObjectIds.includes(nearestNoteObjectId)) {
		if (atStartingPosition) return;
		osmd.cursor.show();
		const scoreEvent = scoreEventList.find(event => event.objectIds.includes(nearestNoteObjectId));
		updateScorePosition(scoreEventList.indexOf(scoreEvent));
		return;
	}

	if (atStartingPosition) osmd.cursor.hide();

	if (osmd.cursor.iterator.EndReached) {
		osmd.cursor.reset();
	} else {
		osmd.cursor.next();
	}
	updateCursorPosition(nearestNoteObjectId);
}

function resetCursor() {
	osmd.cursor.reset();
	updateScorePosition(0);
}

function updateScorePosition(index) {
	if (index == - 1) {
		console.error("Attempted to update score position to invalid index");
		return;
	}

	const currentScoreEvent = scoreEventList[index];
	if (!currentScoreEvent) {
		console.error("No score event at index", index);
		return;
	}

	currentScoreIndex = index;
	noteEventDetector.setNextExpectedNoteEvent(currentScoreEvent.noteEventString, currentScoreEvent.scoreEventId);
}

function draw() {
}