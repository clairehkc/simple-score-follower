class NoteEvent {
	constructor(noteEventString, scoreEventId = undefined) {
		this.noteEventString = noteEventString;
		this.keys = [];
		this.scoreEventId = scoreEventId;
		this.isMonophonic;
		this.parseNoteEventString(noteEventString);
	}

	parseNoteEventString(noteEventString) {
		this.keys = noteEventString.split('-');
		this.isMonophonic = this.keys.length === 1;
	}
}
