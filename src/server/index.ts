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
    client.write(`data: ${JSON.stringify({ desktopOCR: text })}\n\n`);
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

// ___________________________ Auto Subtitle Start
// Global in-memory state
let autoSubtitleOn = false;
let autoSubtitleInterval: NodeJS.Timeout | null = null;

// We'll store the user-selected region in memory
let region = {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
};


/** Capture, OCR, broadcast, and delete the file. */
function doAutoSubtitleCapture() {
  if (!autoSubtitleOn) return; // Just in case

  // Make sure screenshots/ folder exists
  const screenshotsDir = path.join(process.cwd(), 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
  }

  // Create unique file name: screenshots/scrs-{timestamp}.png
  const timestamp = Date.now();
  const scrsFile = path.join(screenshotsDir, `scrs-${timestamp}.png`);

  const { x, y, width, height } = region;
  const captureCmd = `screencapture -x -R${x},${y},${width},${height} "${scrsFile}"`;

  exec(captureCmd, (capErr) => {
    if (capErr) {
      console.error('Failed to capture screenshot region:', capErr);
      return;
    }

    const ocrCmd = `shortcuts run ocr-text -i "${scrsFile}"`;
    exec(ocrCmd, (ocrErr, stdout, stderr) => {
      if (ocrErr) {
        console.error('Error running OCR on region screenshot:', ocrErr);
        return;
      }
      if (stderr) {
        console.error('OCR error output:', stderr);
      }

      const text = stdout.trim();

      // Broadcast to SSE
      broadcastOCRTextForAutoSubtitle(text);

      // Delete the temporary file
      fs.unlink(scrsFile, (unlinkErr) => {
        if (unlinkErr) {
          // Not a big deal if the file is already gone,
          // but let's log it in case there's another issue.
          console.warn(`Failed to remove ${scrsFile}:`, unlinkErr);
        }
      });
    });
  });
}

function broadcastOCRTextForAutoSubtitle(text: string) {
  sseClients.forEach((client) => {
    client.write(`data: ${JSON.stringify({ autoSubtitle: text })}\n\n`);
  });
}


app.post('/api/auto-subtitle', (req, res) => {
  const { on, x, y, width, height } = req.body;
  
  autoSubtitleOn = on;
  if (x !== undefined) region.x = x;
  if (y !== undefined) region.y = y;
  if (width !== undefined) region.width = width;
  if (height !== undefined) region.height = height;

  if (autoSubtitleOn) {
    // Start the periodic capture if not already started
    if (!autoSubtitleInterval) {
      autoSubtitleInterval = setInterval(doAutoSubtitleCapture, 1000); 
      // capture every 2s, or choose your interval
    }
  } else {
    // Stop the interval
    if (autoSubtitleInterval) {
      clearInterval(autoSubtitleInterval);
      autoSubtitleInterval = null;
    }
  }

  res.json({ success: true, autoSubtitleOn, region });
});
// ___________________________ Auto Subtitle End


// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
