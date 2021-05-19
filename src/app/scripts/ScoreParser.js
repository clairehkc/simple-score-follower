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
		this.keySignatures = [];
		this.currentKeySignature;
		this.scoreEvents = [];
	}

	parse(resultText) {
		const parser = new DOMParser();
		const xmlDoc = parser.parseFromString(resultText, "text/xml");
		this.measures = Array.from(xmlDoc.getElementsByTagName("measure"));
		this.measures.forEach(measure => {
			const measureNumber = measure.attributes.getNamedItem("number").value;
			const children = Array.from(measure.children);
			const attributes = children.find(child => child.tagName === "attributes");
			if (attributes) {
				const key = Array.from(attributes.children).find(child => child.tagName === "key");
				const fifths = Array.from(key.children).find(child => child.tagName === "fifths");
				const fifthsIndex = fifths.innerHTML;
				this.currentKeySignature = this.keySignatureTable[fifthsIndex];
				this.keySignatures.push({ measure: measureNumber, keySignature: this.currentKeySignature });
				console.log("this.keySignatures", this.keySignatures);
			}
			const notes = children.filter(node => node.tagName === "note");
			// console.log('notes', notes);
			// this.scoreEvents.push({ measure: measureNumber, note });
		});
		return xmlDoc;
	}

}
