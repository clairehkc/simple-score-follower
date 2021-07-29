let osmd;
let scoreContainer, scoreInput;
let scoreParser, noteEventDetector;
let isDetectorReady = false;
let isAttemptingRecovery = false;
let scoreEventList = [];
let beginRepeatEvents = [];
let endRepeatEvents = [];
let currentScoreIndex = 0;
let consecutiveMisses = 0;
let updateCursorStartingPositionObjectId;
let homeView, libraryView, scoreView, views;
let libraryFilesPageSection, libraryFileList = [];
let startButton, stopButton, skipButton;

const viewNames = {
	HOME: "homeView",
	LIBRARY: "libraryView",
	SCORE: "scoreView",
}

let nextNoteEventLength = 0;
let lastMatchAcceptTime = Date.now();

function setup() {
	const audioContext = getAudioContext();
	const audioInput = new p5.AudioIn();

	noteEventDetector = new NoteEventDetector(audioContext, audioInput, onDetectorReady, onReceiveMatchResult);
	if (noteEventDetector.isUsingTestInterface) return;

	scoreParser = new ScoreParser();

	homeView = document.getElementById("homeView");
	libraryView = document.getElementById("libraryView");
	scoreView = document.getElementById("scoreView");
	views = [homeView, libraryView, scoreView];

	libraryFilesPageSection = document.getElementById("libraryFilesPageSection");
	for (let i = 0; i < localStorage.length; i++)  {
	  const keyName = localStorage.key(i);
	  if (keyName.startsWith("SFA-")) {
	  	libraryFileList.push(localStorage.key(i));
	  }
	}
	libraryFilesPageSection.innerHTML = libraryFileList.toString();


	scoreInput = document.getElementById("scoreInput");
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
	document.getElementById("showLibraryView").addEventListener("click", () => showView(viewNames.LIBRARY));
	document.getElementById("showScoreView").addEventListener("click", () => showView(viewNames.SCORE));
	scoreInput.addEventListener("change", uploadScore);
}

function uploadScore() {
	if (noteEventDetector.streamIsActive) stopStream();
	noteEventDetector.reset();

	const reader = new FileReader();

	const onUploadScore = (xmlDoc) => {
		showView(viewNames.SCORE);
		renderScore(xmlDoc);
	}

	const onFileLoad = (event) => {
		const domParser = new DOMParser();
		const xmlDoc = domParser.parseFromString(reader.result, "text/xml");
		onUploadScore(xmlDoc);
		saveScoreToLibrary(scoreInput.files[0].name, reader.result);
	};

	reader.onload = onFileLoad;
	reader.readAsText(scoreInput.files[0]);
}

function saveScoreToLibrary(fileName, fileText) {
	const savedFileName = 'SFA-' + fileName;
	localStorage.setItem(savedFileName, fileText);
	libraryFileList.push(savedFileName);
	libraryFilesPageSection.innerHTML = libraryFileList;
}

function loadSavedScore(savedFileName) {
	if (noteEventDetector.streamIsActive) stopStream();
	noteEventDetector.reset();

	const onUploadScore = (xmlDoc) => {
		showView(viewNames.SCORE);
		renderScore(xmlDoc);
	}

	const domParser = new DOMParser();
	const savedFileText = localStorage.getItem(savedFileName);
	const xmlDoc = domParser.parseFromString(savedFileText, "text/xml");
	onUploadScore(xmlDoc);
}

function renderScore(xmlDoc) {
	const loadPromise = osmd.load(xmlDoc);

	loadPromise.then(() => {
	  osmd.render();
	  scoreEventList = scoreParser.parse(osmd);
	  scoreEventList.forEach(scoreEvent => noteEventDetector.addNoteEvent(scoreEvent.noteEventString, scoreEvent.scoreEventId));
	  beginRepeatEvents = scoreEventList.filter(event => event.isBeginRepeatEvent);
	  endRepeatEvents = scoreEventList.filter(event => event.isEndRepeatEvent);
	  resetCursor();
	 	observeCursor();
	  const currentScoreEvent = scoreEventList[currentScoreIndex];
	  noteEventDetector.setNextExpectedNoteEvent(currentScoreEvent.noteEventString, currentScoreEvent.scoreEventId);
	  startButton.disabled = false;
	  osmd.cursor.hide();
	});
}

function showView(viewName) {
	switch (viewName) {
		case viewNames.HOME:
			homeView.setAttribute('class', 'view visible');
			break;
		case viewNames.LIBRARY:
			libraryView.setAttribute('class', 'view visible');
			break;
		case viewNames.SCORE:
			scoreView.setAttribute('class', 'view visible');
			break;
	}

	const viewsToHide = views.filter(view => view.id !== viewName);
	viewsToHide.forEach(view => view.setAttribute('class', 'view hidden'));
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
	if (matchTime !== -1 && ((matchTime - lastMatchAcceptTime) < nextNoteEventLength)) return;
	if (!matchResult) {
		if (!isAttemptingRecovery) {
			consecutiveMisses++;
			if (consecutiveMisses > 15) {
				const nextExpectedMonophonicSequence = getNextExpectedMonophonicSequence(currentScoreIndex);
				noteEventDetector.startAttemptRecovery(nextExpectedMonophonicSequence);
				isAttemptingRecovery = true;
			}
		}
		return;
	}

	// successful match
	consecutiveMisses = 0;
	if (isAttemptingRecovery) {
		isAttemptingRecovery = false;
		noteEventDetector.stopAttemptRecovery();
	}

	let newScoreIndex = currentScoreIndex;

	// handle repeats
	const currentScoreEvent = scoreEventList[currentScoreIndex];
	if (currentScoreEvent.isEndRepeatEvent && !currentScoreEvent.hasCompletedRepeat) {
		const priorBeginRepeatEvents = beginRepeatEvents.filter(beginRepeatEvent => beginRepeatEvent.scoreEventId < currentScoreIndex);
		const matchingBeginRepeatEvent = priorBeginRepeatEvents[priorBeginRepeatEvents.length - 1];
		scoreEventList[currentScoreIndex].hasCompletedRepeat = true;
		updateCursorStartingPositionObjectId = currentScoreEvent.objectIds[0];
		updateCursorPositionToOjbectId(matchingBeginRepeatEvent.objectIds[0], true);
	} else {
		if (currentScoreIndex === scoreEventList.length - 1) return;
		if (scoreEventId === currentScoreIndex) {
			// sequential match
			newScoreIndex++;
			osmd.cursor.next();
			updateScorePosition(newScoreIndex);
		} else {
			// recovery match, jump forward
			const matchedEvent = scoreEventList[scoreEventId];
			updateCursorStartingPositionObjectId = currentScoreEvent.objectIds[0];
			updateCursorPositionToOjbectId(matchedEvent.objectIds[0], true);
		}
	}

	lastMatchAcceptTime = matchTime;

	const nextScoreEvent = scoreEventList[newScoreIndex];
	if (nextScoreEvent.noteEventString !== "X") {
		nextNoteEventLength = nextScoreEvent.noteEventLength;
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
  	if (isAttemptingRecovery) {
  		isAttemptingRecovery = false;
  		noteEventDetector.stopAttemptRecovery();
  	}

  	const notesUnderCursor = osmd.cursor.NotesUnderCursor();
  	updateCursorStartingPositionObjectId = notesUnderCursor[0].NoteToGraphicalNoteObjectId;
  	updateCursorPositionToOjbectId(nearestNoteObjectId, true);
  
  }
}

function updateCursorPositionToOjbectId(objectId, isAtStartingPosition = false) {
	const notesUnderCursor = osmd.cursor.NotesUnderCursor();
	const currentScoreEventObjectIds = notesUnderCursor.map(note => note.NoteToGraphicalNoteObjectId);

	if (!isAtStartingPosition && currentScoreEventObjectIds.includes(updateCursorStartingPositionObjectId)) {
		console.error("No matching note found");
		return;
	}

	if (currentScoreEventObjectIds.includes(objectId)) {
		if (isAtStartingPosition) return;
		osmd.cursor.show();
		const scoreEvent = scoreEventList.find(event => event.objectIds.includes(objectId));
		updateScorePosition(scoreEventList.indexOf(scoreEvent));
		return;
	}

	if (isAtStartingPosition) osmd.cursor.hide();
	if (osmd.cursor.iterator.EndReached) {
		osmd.cursor.reset();
	} else {
		osmd.cursor.next();
	}
	updateCursorPositionToOjbectId(objectId);
}

function resetCursor() {
	osmd.cursor.reset();
	updateScorePosition(0);
	if (isAttemptingRecovery) {
		isAttemptingRecovery = false;
		noteEventDetector.stopAttemptRecovery();
	}
	scoreEventList.forEach(event => event.hasCompletedRepeat = false);
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