const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Determine database path safely for Vercel Serverless (/tmp) or Local
const DB_FILE = process.env.VERCEL
  ? path.join('/tmp', 'database.json')
  : path.join(__dirname, '..', 'database.json');

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

let memoryState = null;

function loadStateFromDisk() {
  if (memoryState) return memoryState;

  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      memoryState = JSON.parse(data);
      return memoryState;
    } catch (err) {
      console.error("Erreur de lecture du fichier de base de données :", err);
    }
  }

  memoryState = { ...DEFAULT_STATE };
  return memoryState;
}

function saveStateToDisk(newState) {
  memoryState = { ...newState };
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(newState, null, 2), 'utf8');
  } catch (err) {
    console.error("Erreur d'écriture dans la base de données :", err);
  }
}

// API: Get State
app.get('/api/state', (req, res) => {
  const currentState = loadStateFromDisk();
  res.json(currentState);
});

// API: Save State
app.post('/api/state', (req, res) => {
  const newState = req.body;
  if (!newState) {
    return res.status(400).json({ error: "Aucune donnée fournie." });
  }

  if (newState.members === undefined || newState.transactions === undefined) {
    return res.status(400).json({ error: "Format de données invalide." });
  }

  saveStateToDisk(newState);
  res.json({ success: true });
});

// Export app instance for Vercel Serverless Functions
module.exports = app;

// Allow direct local execution via node api/index.js if needed
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Serveur API à l'écoute sur http://localhost:${PORT}`);
  });
}
