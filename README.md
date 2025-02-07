This is a web app that lets you screenshot a region, extract the text inside it and display it in a web page. It can also automatically extract text from a certain region and update it continuously.

How to run:
- prerequisites:
    - pnpm
    - mac-ocr (command line tool to extract text from image on MacOS)
- open 2 terminals
    - in terminal 1, run `pnpm run start:server`
    - in terminal 2, run `pnpm run dev`
- open browser, go to `http://localhost:5173/`
- It automatically find the latest screenshot from Desktop and extract text. To clear that text, press "Clear"
- If you want to auto-subtitle a certain region, input the region coordinates or choose one of the presets and press "Turn ON Auto Subtitle"
- Note: all the coordinates change only apply when we press "Turn ON Auto Subtitle"
- To turn off auto-subtitle and clear the text, press "Turn OFF Auto Subtitle"