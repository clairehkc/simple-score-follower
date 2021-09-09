# Simple Score Follower

## Getting Started

1) Clone the repo

2) In the `score-following` directory, start a SimpleHTTPServer via `python -m SimpleHTTPServer`

3) Run the app by opening `http://localhost:8000/src/app` in Chrome

4) Upload a musicXML file (.xml) or load the sample score

5) Hit the leftmost microphone button to start following (must allow microphone permissions)

## Running NoteEventDetector

1) Open `http://localhost:8000/src/app/NoteEventDetectorTestInterface.html` in Chrome

2) Enter an event in the form of `<note><octave>` for a single note or `<note1-note2-note3>` for a chord. Try entering "C4" or "C-E-G" for an example.

3) Hit "Update" and then "Start". You can continue to update the event while the detector is running and the pitch or chord detector will activate accordingly.
 
