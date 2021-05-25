class ScoreParser {
	constructor() {
		this.scoreEventList = [];
		this.osmdPitch = opensheetmusicdisplay.Pitch;
		this.accidentalEnum = opensheetmusicdisplay.AccidentalEnum;
	}

	parse(osmd) {
		let scoreEventId = 0;
		let scoreEvent;
		const iterator = osmd.cursor.iterator;

		while (!iterator.EndReached) {
			const notesUnderCursor = osmd.cursor.NotesUnderCursor();
			// console.log(notesUnderCursor);
			if (notesUnderCursor.length === 1) {
				const note = notesUnderCursor[0];
				const noteEventString = this.osmdPitch.getNoteEnumString(note.pitch.fundamentalNote) + this.accidentalEnum[note.pitch.accidental] + (note.pitch.octave + 3).toString();
				scoreEvent = {
					noteEventString,
					scoreEventId,
				}
			} else {
				const noteStrings = notesUnderCursor.map(note => this.osmdPitch.getNoteEnumString(note.pitch.fundamentalNote) + this.accidentalEnum[note.pitch.accidental]);
				const noteEventString = noteStrings.join("-");
				scoreEvent = {
					noteEventString,
					scoreEventId,
				}
			}
			console.log("scoreEvent", scoreEvent);
			this.scoreEventList.push(event);
			scoreEventId++;
			osmd.cursor.next();
		}
	}
}
