import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import compression from 'compression';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Enable compression
app.use(compression());

// Serve static files from the dist directory (after running vite build)
app.use(express.static(join(__dirname, 'dist')));

app.use('/src/assets', express.static(join(__dirname, 'src', 'assets')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Handle all routes for SPA
app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});