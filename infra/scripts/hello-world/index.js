const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

console.log('Starting Hello World API...');
console.log('Port:', port);
console.log('NODE_ENV:', process.env.NODE_ENV);

app.get('/', (req, res) => {
  res.json({
    message: 'Hello World from App Runner!',
    status: 'success',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Hello World API listening on http://0.0.0.0:${port}`);
  console.log(`✅ Health check available at http://0.0.0.0:${port}/health`);
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
