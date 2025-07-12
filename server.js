const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// Security and CORS
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Metadata Removal API is running',
    version: '1.0.0',
    endpoints: {
      'POST /remove-metadata': 'Remove metadata from uploaded image',
      'POST /remove-metadata-url': 'Remove metadata from image URL',
      'GET /health': 'Health check'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Remove metadata from uploaded file
app.post('/remove-metadata', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No image file provided',
        message: 'Please upload an image file'
      });
    }

    // Process image with Sharp - removes ALL metadata
    const processedImage = await sharp(req.file.buffer)
      .jpeg({ quality: 95, mozjpeg: true }) // High quality JPEG
      .withMetadata({}) // Remove all metadata
      .toBuffer();

    // Return processed image
    res.set({
      'Content-Type': 'image/jpeg',
      'Content-Length': processedImage.length,
      'Content-Disposition': 'attachment; filename="cleaned-image.jpg"'
    });

    res.send(processedImage);

  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({
      error: 'Image processing failed',
      message: error.message
    });
  }
});

// Remove metadata from image URL
app.post('/remove-metadata-url', async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        error: 'No image URL provided',
        message: 'Please provide an imageUrl in the request body'
      });
    }

    // Fetch image from URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());

    // Process image with Sharp - removes ALL metadata
    const processedImage = await sharp(imageBuffer)
      .jpeg({ quality: 95, mozjpeg: true }) // High quality JPEG
      .withMetadata({}) // Remove all metadata
      .toBuffer();

    // Return processed image
    res.set({
      'Content-Type': 'image/jpeg',
      'Content-Length': processedImage.length,
      'Content-Disposition': 'attachment; filename="cleaned-image.jpg"'
    });

    res.send(processedImage);

  } catch (error) {
    console.error('Error processing image URL:', error);
    res.status(500).json({
      error: 'Image URL processing failed',
      message: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: 'Image must be smaller than 10MB'
      });
    }
  }
  
  res.status(500).json({
    error: 'Server error',
    message: error.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Metadata Removal API running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
