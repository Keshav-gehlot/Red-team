import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Setup a constant TARGET_DIR pointing to a folder named target_data in the current directory
const TARGET_DIR = path.join(process.cwd(), 'target_data');

// Startup function that automatically creates target_data if it doesn't exist
function init() {
  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
  }
}

init();

// Configure multer to save uploaded files directly into the target_data directory
// Keep the original filename
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TARGET_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });

// Upload Endpoint (POST /api/upload)
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({ message: 'File uploaded successfully', filename: req.file.filename });
});

// File List Endpoint (GET /api/files)
app.get('/api/files', (req, res) => {
  try {
    const files = fs.readdirSync(TARGET_DIR);
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read directory' });
  }
});

// Encryption Endpoint (POST /api/encrypt/:filename)
app.post('/api/encrypt/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(TARGET_DIR, filename);

  // Strict security check: ensure the requested file path startsWith(TARGET_DIR) to prevent directory traversal
  if (!filePath.startsWith(TARGET_DIR)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  try {
    // Read the file using fs.readFileSync as a raw binary buffer
    // DO NOT use 'utf-8' encoding here, as it will corrupt PNGs and PDFs
    // By omitting the encoding parameter, fs.readFileSync returns a raw Buffer
    const rawBuffer = fs.readFileSync(filePath);

    // Convert that raw buffer to a Base64 string
    const base64String = rawBuffer.toString('base64');

    // Write a NEW file to the directory. The name must be the original filename with .txt appended
    const newFilePath = `${filePath}.txt`;
    
    // The contents of this new file should be the Base64 string prefixed with ENC:
    fs.writeFileSync(newFilePath, `ENC:${base64String}`);

    // Delete the original file using fs.unlinkSync
    fs.unlinkSync(filePath);

    res.json({ message: 'File encrypted successfully', newFilename: `${filename}.txt` });
  } catch (error) {
    res.status(500).json({ error: 'Encryption failed' });
  }
});

// Download Endpoint (GET /api/download/:filename)
app.get('/api/download/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(TARGET_DIR, filename);

  // Strict security check: prevent directory traversal
  if (!filePath.startsWith(TARGET_DIR)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Check if the file actually exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // res.download automatically sets the headers to prompt a file download in the browser
  res.download(filePath, filename, (err) => {
    if (err) {
      console.error(`[-] Error downloading ${filename}:`, err);
    } else {
      console.log(`[+] File downloaded: ${filename}`);
    }
  });
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
