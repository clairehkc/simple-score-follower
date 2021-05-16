class ScoreParser {
	constructor() {
		this.keySignatureTable = {};
		this.initializeKeySignatureTable();
		this.scorePath;
	}

	initializeKeySignatureTable() {
		const self = this;
		fetch("./data/CircleOfFifthsKeySignatures.json")
		.then(response => {
		   return response.json();
		})
		.then(data => {
			self.keySignatureTable = data;
		});
	}

	setScorePath(path) {
		this.scorePath = path;
	}

	parse() {
		console.log("scorePath", this.scorePath);
		console.log("table", this.keySignatureTable);

		const xhr = new XMLHttpRequest();

		xhr.onload = function() {
			const xmlDoc = xhr.responseXML;
			console.log("measures", xmlDoc);
			const measures = xmlDoc.getElementsByTagName("measure");
			console.log("measures", measures);
		}

		xhr.onerror = function() {
		  console.error("Error while getting XML.");
		}

		xhr.open("GET", this.scorePath);
		xhr.responseType = "document";
		xhr.send();
	}


}
