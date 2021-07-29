class ScoreParser {
	constructor() {
		if (document.getElementById("saveParserLog")) {
			this.logTable = this.setUpLogTable();
			document.getElementById("saveParserLog").addEventListener("click", this.saveParserLog.bind(this));
		}
	}

	parse(osmd) {
		if (this.logTable) this.logTable.clearRows();

		const scoreEventList = [];
		let scoreEventId = 0;
		let noteEventString;
		let numberOfNotes;
		let lastMeasureNumber;
		let isLastNoteInEndRepeatMeasure = false;
		let hasFoundBeginRepeat = false;

		while (!osmd.cursor.iterator.EndReached) {
			const notesUnderCursor = osmd.cursor.NotesUnderCursor();
			let firstNote = notesUnderCursor[0];
			if (notesUnderCursor.length === 1) {
				if (firstNote.pitch) {
					noteEventString = this.createNoteEventString(firstNote) + (firstNote.pitch.Octave + 3).toString();
					numberOfNotes = 1;
				} else {
					noteEventString = "X";
					numberOfNotes = 0;
				}
			} else {
				const noteStrings = notesUnderCursor.map(note => this.createNoteEventString(note));
				const filteredNoteStrings = noteStrings.filter(note => note !== "X");
				numberOfNotes = filteredNoteStrings.length;
				if (numberOfNotes === 0) {
					noteEventString = "X";
				} else if (numberOfNotes === 1) {
					const noteIndex = noteStrings.indexOf(filteredNoteStrings[0]);
					firstNote = notesUnderCursor[noteIndex];
					noteEventString = filteredNoteStrings[0] + (firstNote.pitch.Octave + 3).toString();
				} else {
					noteEventString = filteredNoteStrings.join("-");	
				}
			}
			const measureNumber = firstNote.SourceMeasure.MeasureNumber;
			const noteEventLength = firstNote.length && firstNote.length.realValue * 1000;
			const objectIds = notesUnderCursor.map(note => note.NoteToGraphicalNoteObjectId);

			const isBeginRepeatEvent = (firstNote.SourceMeasure.beginsWithLineRepetition() && lastMeasureNumber !== measureNumber);
			const isEndRepeatEvent = false;
			const didPassEndRepeatEvent = isLastNoteInEndRepeatMeasure && !firstNote.SourceMeasure.endsWithLineRepetition();
			if (didPassEndRepeatEvent) {
				if (scoreEventId === 0) {
					console.error("End repetition found at unexpected index 0");
				} else {
					scoreEventList[scoreEventId - 1].isEndRepeatEvent = true;
					if (!hasFoundBeginRepeat) {
						// if an end repeat has been found before a begin repeat, mark the first note event as the begin repeat point
						scoreEventList[0].isBeginRepeatEvent = true;
						hasFoundBeginRepeat = true;
					}
				}
			}

			const scoreEvent = {
				noteEventString,
				noteEventLength,
				numberOfNotes,
				measureNumber,
				scoreEventId,
				objectIds,
				isBeginRepeatEvent,
				isEndRepeatEvent,
				hasCompletedRepeat: false,
			}

			scoreEventList.push(scoreEvent);
			scoreEventId++;
			lastMeasureNumber = measureNumber;
			isLastNoteInEndRepeatMeasure = firstNote.SourceMeasure.endsWithLineRepetition();			
			osmd.cursor.next();
		}

		// if score ends while moving through an end repeat measure, mark the last note event as the end repeat point
		if (isLastNoteInEndRepeatMeasure) scoreEventList[scoreEventList.length - 1].isEndRepeatEvent = true;
		if (this.logTable) scoreEventList.forEach(event => this.logResult(event));
		return scoreEventList;
	}

	createNoteEventString(note) {
		if (!note.pitch) return "X"; // no sound expected
		const osmdPitch = opensheetmusicdisplay.Pitch;
		const accidentalType = opensheetmusicdisplay.AccidentalEnum[note.pitch.Accidental];
		const noteLetterList = ["C", "D", "E", "F", "G", "A", "B"];

		let noteLetterString = osmdPitch.getNoteEnumString(note.pitch.FundamentalNote);
		let accidentalString = "";

		const noteLetterIndex = noteLetterList.indexOf(noteLetterString);

		switch (accidentalType) {
			case "SHARP":
				accidentalString = "#";
				break;
			case "FLAT":
				// convert flat to sharp
				noteLetterString = (noteLetterIndex > 0) ? noteLetterList[noteLetterIndex - 1] : "B";
				accidentalString = "#";
				break;
			case "NONE":
				break;
			case "NATURAL":
				break;
			case "DOUBLESHARP":
				noteLetterString = (noteLetterIndex < 6) ? noteLetterList[noteLetterIndex + 1] : "C";
				break;
			case "DOUBLEFLAT":
				noteLetterString = (noteLetterIndex < 0) ? noteLetterList[noteLetterIndex - 1] : "B";
				break;
			case "TRIPLESHARP":
				break;
			case "TRIPLEFLAT":
				break;
			case "QUARTERTONESHARP":
				break;
			case "QUARTERTONEFLAT":
				break;
			case "THREEQUARTERSSHARP":
				break;
			case "THREEQUARTERSFLAT":
				break;
		}

		return noteLetterString + accidentalString;
	}

	setUpLogTable() {
		const table = new p5.Table();
		table.addColumn('Event');
		table.addColumn('Event_Length');
		table.addColumn('Complexity');
		table.addColumn('Measure_Number');
		table.addColumn('Score_Id');
		return table;
	}

	saveParserLog() {
		if (!this.logTable) return;
		saveTable(this.logTable, 'parser_log.csv');
	}

	logResult(scoreEvent) {
		let newRow = this.logTable.addRow();
		const {
			noteEventString,
			noteEventLength,
			numberOfNotes,
			measureNumber,
			scoreEventId,
			objectIds,
		} = scoreEvent;
		newRow.setString('Event', noteEventString);
		newRow.setString('Event_Length', noteEventLength.toString());
		newRow.setString('Complexity', numberOfNotes.toString());
		newRow.setString('Measure_Number', measureNumber.toString());
		newRow.setString('Score_Id', scoreEventId.toString());
	}
}
