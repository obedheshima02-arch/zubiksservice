const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Allow large state payloads if needed (snapshot, etc.)
app.use(express.static(__dirname)); // Serve index.html, style.css, app.js, etc.

// Default state template
const DEFAULT_STATE = {
  members: [],
  dailyDepots: 0,
  dailyRetraits: 0,
  cycleDepots: 0,
  cycleRetraits: 0,
  argentDebut: 0,
  reglements: "",
  archives: [],
  dailyArchives: [],
  transactions: [],
  credentials: {
    email: "zubiksservice@gmail.com",
    password: "Zubiks@2000"
  }
};

// API: Get State
app.get('/api/state', (req, res) => {
  fs.readFile(DB_FILE, 'utf8', (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // File doesn't exist yet, return default template
        return res.json(DEFAULT_STATE);
      }
      console.error("Erreur de lecture de database.json :", err);
      return res.status(500).json({ error: "Impossible de lire la base de données locale." });
    }
    
    try {
      const parsed = JSON.parse(data);
      res.json(parsed);
    } catch (parseErr) {
      console.error("Erreur de parsing JSON :", parseErr);
      res.status(500).json({ error: "Base de données corrompue." });
    }
  });
});

// API: Save State
app.post('/api/state', (req, res) => {
  const newState = req.body;
  
  if (!newState) {
    return res.status(400).json({ error: "Aucune donnée fournie." });
  }
  
  // Basic validation to check it's our state schema
  if (newState.members === undefined || newState.transactions === undefined) {
    return res.status(400).json({ error: "Format de données invalide." });
  }

  // Backup existing database before writing (safety first!)
  if (fs.existsSync(DB_FILE)) {
    fs.copyFileSync(DB_FILE, `${DB_FILE}.bak`);
  }

  fs.writeFile(DB_FILE, JSON.stringify(newState, null, 2), 'utf8', (err) => {
    if (err) {
      console.error("Erreur d'écriture dans database.json :", err);
      return res.status(500).json({ error: "Impossible de sauvegarder les données." });
    }
    res.json({ success: true });
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`   ZUBIX SERVICE - SERVEUR DYNAMIQUE DÉMARRÉ`);
  console.log(`   Accédez à l'application sur : http://localhost:${PORT}`);
  console.log(`   Les données sont stockées dans : ${DB_FILE}`);
  console.log(`==================================================`);
});
