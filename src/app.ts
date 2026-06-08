import express from 'express';

const app = express();

// Other existing routes and middleware

app.get('/api/v1/uptime', (req, res) => {
    res.json({ uptime: process.uptime() });
});

// Existing export statement
export default app;
