class ScoreParser {
	constructor() {
		this.keySignatureTable = {
			"1": ["F"],
			"2": ["C", "F"],
			"3": ["C", "F", "G"],
			"4": ["C", "D", "F", "G"],
			"5": ["A", "C", "D", "F", "G"],
			"6": ["A", "C", "D", "E", "F", "G"],
			"7": ["A", "B", "C", "D", "E", "F", "G"],
			"-7": ["F", "G", "A", "B", "C", "D", "E"],
			"-6": ["G", "A", "B", "C", "D", "E"],
			"-5": ["G", "A", "B", "D", "E"],
			"-4": ["A", "B", "D", "E"],
			"-3": ["A", "B", "E"],
			"-2": ["B", "E"],
			"-1": ["B"]
		};
		this.key1 = [];
		this.key2 = []; 
		this.scorePath;
	}

	parse(resultText) {
		const parser = new DOMParser();
		const xmlDoc = parser.parseFromString(resultText, "text/xml");
		const measures = xmlDoc.getElementsByTagName("measure");
		return measures;
	}

}
