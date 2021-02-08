class NoteEvent {
	constructor(noteEventString, scoreEventId = undefined) {
		this.noteEventString = noteEventString;
		this.keys = [];
		this.scoreEventId = scoreEventId;
		this.isMonophonic;
		this.noteEventId;
		this.chordTemplate;
		this.parseNoteEventString(noteEventString);
	}

	parseNoteEventString(noteEventString) {
		this.keys = noteEventString.split('-');
		this.isMonophonic = this.keys.length === 1;
		this.noteEventId = this.keys.sort().join('-'); // need to standardize sharps/flats
	}
}
