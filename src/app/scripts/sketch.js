let osmd;
let scoreContainer, scoreInput;
let scoreParser, noteEventDetector;
let isDetectorReady = false;
let isAttemptingRecovery = false;
let scoreRendered = false;
let scoreEventList = [];
let beginRepeatEvents = [];
let endRepeatEvents = [];
let currentScoreIndex = 0;
let consecutiveMisses = 0;
let updateCursorStartingPositionObjectId;
let libraryView, scoreView;
let startButton, stopButton, skipButton, resetButton;

const viewNames = {
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

	libraryView = document.getElementById("libraryView");
	scoreView = document.getElementById("scoreView");

	scoreInput = document.getElementById("scoreInput");
	scoreContainer = document.getElementById("scoreContainer");
	osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(scoreContainer);
	scoreContainer.addEventListener("click", onScoreClick);

	startButton = document.getElementById("startControlButton");
	stopButton = document.getElementById("stopControlButton");
	skipButton = document.getElementById("skipControlButton");
	resetButton = document.getElementById("resetControlButton");

	startButton.addEventListener("click", startStream);
	stopButton.addEventListener("click", stopStream);
	skipButton.addEventListener("click", skipEvent);
	resetButton.addEventListener("click", onResetButtonClick);

	document.getElementById("uploadNavButton").addEventListener("click", () => scoreInput.click());
	document.getElementById("libraryNavButton").addEventListener("click", () => showView(viewNames.LIBRARY));
	document.getElementById("scoreNavButton").addEventListener("click", () => showView(viewNames.SCORE));
	scoreInput.addEventListener("change", uploadScore);
	updateLibraryView();
}

function updateLibraryView() {
	const libraryFilesPageSection = document.getElementById("libraryFilesPageSection");
	const libraryFileList = [];
	libraryFilesPageSection.innerHTML = '';
	
	for (let i = 0; i < localStorage.length; i++)  {
	  const keyName = localStorage.key(i);
	  if (keyName.startsWith("SFA-")) {
	  	libraryFileList.push(localStorage.key(i));
	  }
	}
	
	libraryFileList.forEach(fileName => {
		const fileView = document.createElement("div");
		fileView.className = "fileView";
		const name = fileName.replace("SFA-", "");
		fileView.id = fileName;
		fileView.appendChild(document.createTextNode(name));
		libraryFilesPageSection.appendChild(fileView);
	});

	const fileViews = document.getElementsByClassName("fileView");
	Array.from(fileViews).forEach((fileView) => {
    fileView.addEventListener('click', () => loadScore(fileView.id));
  });
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

function loadScore(fileName) {
	if (noteEventDetector.streamIsActive) stopStream();
	noteEventDetector.reset();

	const xmlDoc = localStorage.getItem(fileName);
	showView(viewNames.SCORE);
	renderScore(xmlDoc);
}

function saveScoreToLibrary(fileName, fileText) {
	const savedFileName = 'SFA-' + fileName;
	localStorage.setItem(savedFileName, fileText);
	updateLibraryView(savedFileName);
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
	  startButton.setAttribute('class', 'controlButton enabled');
	  osmd.cursor.hide();
	  scoreRendered = true;
	  document.getElementById("defaultScoreViewMessageContainer").setAttribute('class', 'hidden');
	});
}

function showView(viewName) {
	const views = [libraryView, scoreView];
	const buttons = [uploadNavButton, libraryNavButton, scoreNavButton];
	views.forEach(view => view.setAttribute('class', 'view hidden'));
	buttons.forEach(button => button.setAttribute('class', 'navButton inactive'));

	switch (viewName) {
		case viewNames.LIBRARY:
			libraryView.setAttribute('class', 'view visible');
			libraryNavButton.setAttribute('class', 'navButton active');
			break;
		case viewNames.SCORE:
			scoreView.setAttribute('class', 'view visible');
			scoreNavButton.setAttribute('class', 'navButton active');
			break;
	}
}

function onDetectorReady() {
	if (noteEventDetector.isUsingTestInterface) return;
	isDetectorReady = true;
	osmd.cursor.show();
}

function startStream() {
	if (!scoreRendered) return;
	noteEventDetector.startStream();
	startButton.setAttribute('class', 'controlButton disabled');
	stopButton.setAttribute('class', 'controlButton enabled');
	skipButton.setAttribute('class', 'controlButton enabled');
	resetButton.setAttribute('class', 'controlButton enabled');
}

function stopStream() {
	if (!noteEventDetector.streamIsActive) return;
	noteEventDetector.stopStream();
	osmd.cursor.hide();
	startButton.setAttribute('class', 'controlButton enabled');
	stopButton.setAttribute('class', 'controlButton disabled');
	skipButton.setAttribute('class', 'controlButton disabled');
	resetButton.setAttribute('class', 'controlButton disabled');
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
	if (!noteEventDetector.streamIsActive) return;
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

function onResetButtonClick() {
	if (!noteEventDetector.streamIsActive) return;
	resetCursor();
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