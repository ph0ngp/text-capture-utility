// src/client/App.tsx
import React from 'react';

export default function App() {
  const [latestText, setLatestText] = React.useState('');

  React.useEffect(() => {
    // Create an EventSource to our SSE endpoint
    const eventSource = new EventSource('http://localhost:3000/api/sse');

    // On receiving a message from the server, parse the data and update state
    eventSource.onmessage = (event) => {
      try {
        const { text } = JSON.parse(event.data);
        setLatestText(text);
      } catch (err) {
        console.error('Failed to parse SSE event:', err);
      }
    };

    // If needed, handle error events
    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      // We could reconnect, show a notification, etc.
    };

    // Cleanup when the component unmounts
    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Latest OCR Text (Instant Update with SSE)</h1>
      <p>{latestText}</p>
    </div>
  );
}
