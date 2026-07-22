const app = require('./api/index.js');
const express = require('express');
const path = require('path');

// Serve static assets from public folder locally
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all route for SPA local fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`   ZUBIX SERVICE - SERVEUR LOCAL DÉMARRÉ`);
  console.log(`   Accédez à l'application sur : http://localhost:${PORT}`);
  console.log(`==================================================`);
});
