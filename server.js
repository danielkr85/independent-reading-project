const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
// Define the directory where your static files (like your game files) are located
const PUBLIC_DIR = path.join(__dirname, 'public');

// Helper function to determine the content type
const getContentType = (filePath) => {
    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        // Add other types as needed
    };
    return mimeTypes[extname] || 'application/octet-stream';
};

// Create the server
const server = http.createServer((req, res) => {
    // Construct the file path requested by the client
    let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);

    // Read the file and serve it
    fs.readFile(filePath, (err, content) => {
        if (err) {
            // Handle file not found (404)
            if (err.code == 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404: File Not Found</h1>', 'utf-8');
            } else {
                // Handle other server errors (500)
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            // Success: Serve the file
            res.writeHead(200, { 'Content-Type': getContentType(filePath) });
            res.end(content, 'utf-8');
        }
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Game server running at http://localhost:${PORT}`);
    console.log(`Serving files from: ${PUBLIC_DIR}`);
});