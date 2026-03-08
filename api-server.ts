import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { put, list, del } from '@vercel/blob';

const app = express();

app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN is not configured.' });
  }
  try {
    const blob = await put(req.file.originalname, req.file.buffer, {
      access: 'public',
      addRandomSuffix: false
    });
    res.json({ message: 'File uploaded successfully', filename: req.file.originalname, url: blob.url });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: `Upload failed: ${error.message}` });
  }
});

app.get('/api/files', async (req, res) => {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN is not configured. Please add it to your environment variables.' });
    }
    const { blobs } = await list();
    const files = blobs.map(blob => blob.pathname);
    res.json(files);
  } catch (error: any) {
    console.error('Error reading directory:', error);
    res.status(500).json({ error: `Failed to read directory: ${error.message}` });
  }
});

app.post('/api/encrypt/:filename', async (req, res) => {
  const { filename } = req.params;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN is not configured.' });
  }

  try {
    const { blobs } = await list();
    const blob = blobs.find(b => b.pathname === filename);
    
    if (!blob) {
      return res.status(404).json({ error: 'File not found' });
    }

    const response = await fetch(blob.url);
    const arrayBuffer = await response.arrayBuffer();
    const rawBuffer = Buffer.from(arrayBuffer);

    const base64String = rawBuffer.toString('base64');
    const newFilename = `${filename}.txt`;
    const encryptedContent = `ENC:${base64String}`;

    await put(newFilename, encryptedContent, {
      access: 'public',
      addRandomSuffix: false
    });

    await del(blob.url);

    res.json({ message: 'File encrypted successfully', newFilename });
  } catch (error: any) {
    console.error('Encryption error:', error);
    res.status(500).json({ error: `Encryption failed: ${error.message}` });
  }
});

app.get('/api/download/:filename', async (req, res) => {
  const { filename } = req.params;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN is not configured.' });
  }

  try {
    const { blobs } = await list();
    const blob = blobs.find(b => b.pathname === filename);

    if (!blob) {
      return res.status(404).json({ error: 'File not found' });
    }

    const response = await fetch(blob.url);
    if (!response.ok) throw new Error(`Failed to fetch blob: ${response.statusText}`);
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
    
    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (error: any) {
    console.error('Download error:', error);
    res.status(500).json({ error: `Download failed: ${error.message}` });
  }
});

export default app;
