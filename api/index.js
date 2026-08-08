const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Foundit API Server is running smoothly on Vercel!',
    timestamp: new Date().toISOString(),
  });
});

module.exports = app;
