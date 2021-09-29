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
let startButton, stopButton, skipButton, resetButton, controlButtons;

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
	controlButtons = [startButton, stopButton, skipButton, resetButton];

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

	const defaultLibraryViewMessage = document.getElementById("defaultLibraryViewMessageContainer");
	if (libraryFileList.length > 0) {
		defaultLibraryViewMessage.setAttribute('class', 'hidden');
	} else {
		defaultLibraryViewMessage.setAttribute('class', 'defaultViewMessageContainer');
	}
	
	libraryFileList.forEach(fileName => {
		const fileView = document.createElement("div");
		fileView.className = "fileView";
		const savedName = fileName.replace("SFA-", "");
		fileView.id = fileName;
		fileView.title = "Load Score";

		const fileViewFileIcon = document.createElement("img");
		fileViewFileIcon.className = "fileViewFileIcon";
		fileViewFileIcon.src = "src/app/style/icons/music-file.svg";
		fileView.appendChild(fileViewFileIcon);

		const fileViewText = document.createElement("div");
		fileViewText.appendChild(document.createTextNode(savedName));
		fileView.appendChild(fileViewText);
		libraryFilesPageSection.appendChild(fileView);

		const fileViewDeleteIcon = document.createElement("img");
		fileViewDeleteIcon.className = "fileViewDeleteIcon";
		fileViewDeleteIcon.src = "src/app/style/icons/delete.svg";
		fileViewDeleteIcon.title = "Delete Score"
		fileViewDeleteIcon.onmouseover = () => fileViewDeleteIcon.src = "src/app/style/icons/delete-dark.svg";
		fileViewDeleteIcon.onmouseout = () => fileViewDeleteIcon.src = "src/app/style/icons/delete.svg";
		fileViewDeleteIcon.onclick = (event) => {
			localStorage.removeItem(fileView.id);
			event.stopPropagation();
			updateLibraryView();
		}
		fileView.appendChild(fileViewDeleteIcon);
		fileView.addEventListener('click', () => loadScoreFromLibrary(fileView.id));
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

function loadScoreFromLibrary(fileName) {
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

function loadSampleScore() {
	const sampleScoreFilePath = "src/app/data/sample_scores/Bach_Minuet_in_G_Major_BWV_Anh_114.xml";

	const xhr = new XMLHttpRequest();
  xhr.open("GET", sampleScoreFilePath, true);
  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4 && xhr.status === 200) {
      showView(viewNames.SCORE);
      renderScore(xhr.responseXML);
    }
  };
  xhr.send();
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
	  osmd.cursor.hide();
	  document.getElementById("controlBar").setAttribute('class', 'visible');
	  controlButtons.forEach(button => button.setAttribute('class', 'controlButton disabled'));
	  startButton.setAttribute('class', 'controlButton enabled');
	  if (!scoreRendered) document.getElementById("defaultScoreViewMessageContainer").remove();
	  scoreRendered = true;
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
	if (!scoreRendered || noteEventDetector.streamIsActive) return;
	noteEventDetector.startStream();

	controlButtons.forEach(button => button.setAttribute('class', 'controlButton enabled'));
	startButton.setAttribute('class', 'controlButton disabled');

	const boundingRect = startButton.getBoundingClientRect();
	const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
	const startButtonTop = boundingRect.top + scrollTop;
	window.scroll({
	  top: parseFloat(startButtonTop),
	  behavior: 'smooth'
	});
}

function stopStream() {
	if (!noteEventDetector.streamIsActive) return;
	noteEventDetector.stopStream();
	osmd.cursor.hide();
	controlButtons.forEach(button => button.setAttribute('class', 'controlButton disabled'));
	startButton.setAttribute('class', 'controlButton enabled');
}

function getNextExpectedMonophonicSequence(index, sequenceLength = 6) {
	if (index + 1 >= scoreEventList.length) return;
	let sequence = [];
	for (let i = index + 1; i < scoreEventList.length; i++) {
		const currentEvent = scoreEventList[i];
		if (currentEvent.numberOfNotes === 1) {
			const noteEvent = noteEventDetector.createNoteEvent(currentEvent.noteEventString, currentEvent.scoreEventId);
			sequence.push(noteEvent);
		}
		if (sequence.length === sequenceLength) break;
	}
	return sequence;
}

function onReceiveMatchResult(scoreEventId, matchResult, matchTime) {
	if (matchTime !== -1 && ((matchTime - lastMatchAcceptTime) < nextNoteEventLength)) return;
	if (!matchResult) {
		if (!isAttemptingRecovery) {
			const allowedMisses = noteEventDetector.isMonophonicPiece ? 20 : 8;
			consecutiveMisses++;
			if (consecutiveMisses > allowedMisses) {
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
			currentScoreIndex++;
			osmd.cursor.next();
			updateScorePosition(currentScoreIndex);
		} else {
			// recovery match, jump forward
			const matchedEvent = scoreEventList[scoreEventId];
			updateCursorStartingPositionObjectId = currentScoreEvent.objectIds[0];
			updateCursorPositionToOjbectId(matchedEvent.objectIds[0], true);
		}
	}

	lastMatchAcceptTime = matchTime;

	const nextScoreEvent = scoreEventList[currentScoreIndex];
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