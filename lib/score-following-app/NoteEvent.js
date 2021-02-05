class NoteEvent {
	constructor(noteEventString, scoreEventId = undefined) {
		this.isMonophonic = true;
		this.keys = [];
		this.scoreEventId = scoreEventId;
		this.noteEventId;
		this.octave;
		this.chordTemplate;
		this.parseNoteEventString(noteEventString);
	}

	parseNoteEventString(noteEventString) {
		this.keys = noteEventString.split('-');
		this.isMonophonic = this.keys.length === 1;
		this.noteEventId = this.keys.sort().join('-');
	}
}
