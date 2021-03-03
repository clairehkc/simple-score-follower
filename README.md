# score-following

## Getting Started

Clone the repo

In the `score-following` directory, start a SimpleHTTPServer via `python -m SimpleHTTPServer`

In Chrome, open `http://localhost:8000/src/app/`

Enter an event in the form of `<note><octave>` for a single note or `<note1-note2-note3>` for a chord. Try entering "C4" or "C-E-G" for an example.

Hit "Update" and then "Start". You can continue to update the event while the detector is running.

Currently only major and minor chords are supported. 
