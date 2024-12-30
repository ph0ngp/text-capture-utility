import React, { useState } from 'react';

export default function App() {
  const [latestText, setLatestText] = useState('');
  const [autoSubtitleText, setAutoSubtitleText] = useState('');

  // For region input
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [w, setW] = useState(400);
  const [h, setH] = useState(100);

  const [autoSubtitleOn, setAutoSubtitleOn] = useState(false);

  // SSE effect:
  React.useEffect(() => {
    const eventSource = new EventSource('http://localhost:3000/api/sse');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // If we received desktop screenshot OCR
        if (data.desktopOCR) {
          setLatestText(data.desktopOCR);
        }

        // If we received auto-subtitle OCR
        if (data.autoSubtitle) {
          setAutoSubtitleText(data.autoSubtitle);
        }
      } catch (err) {
        console.error('Failed to parse SSE event:', err);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Toggling Auto Subtitle
  const toggleAutoSubtitle = async () => {
    const newState = !autoSubtitleOn;
    setAutoSubtitleOn(newState);

    // Send the toggle + region to server
    try {
      await fetch('http://localhost:3000/api/auto-subtitle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          on: newState,
          x,
          y,
          width: w,
          height: h,
        }),
      });
    } catch (err) {
      console.error('Failed to toggle auto-subtitle:', err);
    }
  };

  return (
    <div>
      {/* <h1>Latest OCR Text from ~/Desktop Screenshots</h1> */}
      <pre className="reader_class">{latestText}</pre>

      {/* <h2>Auto Subtitle Mode</h2> */}
      <div>
        <label>
            X:
            <input type="number" value={x} onChange={(e) => setX(Number(e.target.value))} />
        </label>
        <label>
            Y:
            <input type="number" value={y} onChange={(e) => setY(Number(e.target.value))} />
        </label>
        <label>
            Width:
            <input type="number" value={w} onChange={(e) => setW(Number(e.target.value))} />
        </label>
        <label>
            Height:
            <input type="number" value={h} onChange={(e) => setH(Number(e.target.value))} />
        </label>

        <button onClick={toggleAutoSubtitle}>
            {autoSubtitleOn ? 'Turn OFF Auto Subtitle' : 'Turn ON Auto Subtitle'}
        </button>
      </div>

      {/* <h3>Auto Subtitle OCR Text</h3> */}
      <pre className="reader_class">{autoSubtitleText}</pre>
    </div>
  );
}
