import express from 'express';
import { json } from 'body-parser';

const app = express();
app.use(json());

app.get('/api/v1/uptime', (req, res) => {
    const uptime = process.uptime();
    res.json({ uptime });
});

// Other routes and middleware can be added here

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
