import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import app from './app';

dotenv.config();

const PORT = process.env.PORT || 3000;

const server = express();

server.use(express.json());
server.use(app);

const startServer = () => {
    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
};

export default startServer;
