// src/server/index.ts
import express from 'express';
import cors from 'cors';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { exec } from 'child_process';

const app = express();
app.use(cors());
app.use(express.json());

/**
 * List of active SSE connections.
 * Whenever new OCR text arrives, we'll send it to each client.
 */
let sseClients: express.Response[] = [];

// SSE Endpoint
app.get('/api/sse', (req, res) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Immediately flush headers
  res.flushHeaders?.(); // In case of compression, etc.

  // Add this response to the SSE clients array
  sseClients.push(res);

  // If client closes the connection, remove it from the list
  req.on('close', () => {
    sseClients = sseClients.filter(client => client !== res);
  });
});

/**
 * Helper function: Broadcast new OCR text to all SSE clients.
 */
function broadcastOCRText(text: string) {
  sseClients.forEach((client) => {
    // SSE format: "data: <some JSON>\n\n"
    client.write(`data: ${JSON.stringify({ text })}\n\n`);
  });
}

// Watch the Desktop folder for new screenshots
const desktopPath = path.join(os.homedir(), 'Desktop');

fs.watch(desktopPath, (eventType, filename) => {
    // If filename is null or empty, just return
  if (!filename) return;
  if (eventType === 'rename' && filename.startsWith('Screenshot')) {
    const screenshotFilePath = path.join(desktopPath, filename);

    // Make sure the file actually exists (fs.watch can be triggered on remove, too)
    if (!fs.existsSync(screenshotFilePath)) return;

    // Run the Shortcut
    const command = `shortcuts run ocr-text -i "${screenshotFilePath}"`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Error running OCR shortcut:', error);
        return;
      }
      if (stderr) {
        console.error('OCR shortcut stderr:', stderr);
      }

      const ocrText = stdout.trim();
      console.log('Received OCR text:', ocrText);

      // Broadcast to all SSE listeners
      broadcastOCRText(ocrText);
    });
  }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
