const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    message: 'Hello World API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Hello World from App Runner!',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
    },
  });
});

// API endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'API is working!',
    database: {
      host: process.env.DB_HOST || 'not configured',
      name: process.env.DB_NAME || 'not configured',
      status: 'placeholder - will be replaced by real API',
    },
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Hello World API listening on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database host: ${process.env.DB_HOST || 'not configured'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
