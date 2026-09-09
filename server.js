const http = require('http');
const fs = require('fs');
const path = require('path');

// Membaca .env manual
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) process.env[key.trim()] = value.join('=').trim();
    });
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PORT = 3000;

const server = http.createServer(async (req, res) => {
    // API Endpoint
    if (req.method === 'POST' && req.url === '/api/generate') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
            try {
                const { idea, sceneCount, duration, imageStyle, language, contentType } = JSON.parse(body);

                let promptPart = '';
                if (contentType === 'Narasi') {
                    promptPart = `Sertakan narasi deskriptif untuk setiap adegan.`;
                } else if (contentType === 'Dialog') {
                    promptPart = `Sertakan dialog percakapan antar karakter.`;
                } else {
                    promptPart = `JANGAN sertakan narasi atau dialog.`;
                }

                const prompt = `Buatkan storyboard untuk ide: "${idea}". 
                                Buat tepat ${sceneCount} adegan berurutan.
                                Durasi per adegan: ${duration} detik.
                                Gaya Visual: ${imageStyle}.
                                Gunakan sudut kamera yang bervariasi dan random untuk setiap adegan.
                                Bahasa Output: ${language}.
                                ${promptPart}
                                Jika konten dipilih, masukkan konten tersebut ke dalam "videoPrompt" agar aksi video sinkron.
                                Output HARUS berupa JSON array yang valid, tanpa teks penjelasan tambahan.
                                Format: [{"narasi": "...", "imagePrompt": "...", "videoPrompt": "..."}]`;

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });

                const data = await response.json();
                const text = data.candidates[0].content.parts[0].text;
                const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(jsonString);
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Gagal memproses permintaan' }));
            }
        });
    } else {
        // Serve static files
        const relativePath = req.url === '/' ? 'index.html' : req.url;
        const filePath = path.join(__dirname, 'public', relativePath);
        
        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(404);
                res.end('File tidak ditemukan');
            } else {
                const ext = path.extname(filePath);
                const contentType = ext === '.html' ? 'text/html' : (ext === '.css' ? 'text/css' : 'text/javascript');
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content);
            }
        });
    }
});

server.listen(PORT, () => console.log(`Server berjalan di http://localhost:${PORT}`));