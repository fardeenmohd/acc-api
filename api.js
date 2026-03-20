const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 8080;

// Enable CORS so your YunoHost webapp can fetch this data
app.use(cors());

// Helper function to safely check and parse JSON files
const readJsonFile = (filePath) => {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    const fileContent = fs.readFileSync(filePath, 'utf8');
    try {
        return JSON.parse(fileContent);
    } catch (e) {
        throw new Error(`Typo or invalid JSON format in: ${filePath}`);
    }
};

// Endpoint 1: Get basic server info (Track, Name, Slots)
app.get('/api/info', (req, res) => {
    try {
        const settingsPath = path.join(__dirname, 'cfg', 'settings.json');
        const eventPath = path.join(__dirname, 'cfg', 'event.json');
        
        const settings = readJsonFile(settingsPath);
        const event = readJsonFile(eventPath);
        
        res.json({
            serverName: settings.serverName || 'Unknown Server',
            track: event.track || 'Unknown Track',
            maxSlots: settings.maxCarSlots || 0
        });
    } catch (error) {
        console.error("API Info Error:", error.message);
        res.status(500).json({ 
            error: 'Could not read ACC config files.', 
            details: error.message 
        });
    }
});

// Endpoint 2: Get a list of all race result files
app.get('/api/results', (req, res) => {
    try {
        const resultsDir = path.join(__dirname, 'results');
        
        // Return an empty array if no races have finished yet
        if (!fs.existsSync(resultsDir)) {
            return res.json([]); 
        }

        const files = fs.readdirSync(resultsDir)
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const filePath = path.join(resultsDir, file);
                const stat = fs.statSync(filePath);
                return { 
                    filename: file, 
                    date: stat.mtime 
                };
            })
            .sort((a, b) => b.date - a.date); // Sort newest races first

        res.json(files);
    } catch (error) {
        console.error("API Results Error:", error.message);
        res.status(500).json({ 
            error: 'Could not read results directory.', 
            details: error.message 
        });
    }
});

// Endpoint 3: Get the exact data for a specific race result
app.get('/api/results/:filename', (req, res) => {
    try {
        const filePath = path.join(__dirname, 'results', req.params.filename);
        const fileData = readJsonFile(filePath);
        res.json(fileData);
    } catch (error) {
        console.error("API Single Result Error:", error.message);
        res.status(404).json({ 
            error: 'Result file not found or invalid.', 
            details: error.message 
        });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`ACC API is running on port ${PORT}`);
    console.log(`Looking for configs in: ${path.join(__dirname, 'cfg')}`);
});
