class ScoreParser {
	constructor() {
	}

	parse(filepath) {
		console.log("filepath", filepath);
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

		xhr.open("GET", filepath);
		xhr.responseType = "document";
		xhr.send();
	}


}
