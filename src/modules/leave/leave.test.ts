import request from 'supertest';
import express from 'express';
import leaveRoutes from './leave.routes';

const app = express();
app.use(leaveRoutes);

describe('GET /api/v1/version', () => {
    it('should return the current version from package.json', async () => {
        const response = await request(app).get('/api/v1/version');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('version');
    });
});
