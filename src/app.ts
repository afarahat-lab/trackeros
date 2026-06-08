import express from 'express';

const app = express();

// Existing routes and middleware...

app.get('/api/v1/ping', (req, res) => {
    res.json({ pong: true });
});

// Existing export statement...
export default app;
