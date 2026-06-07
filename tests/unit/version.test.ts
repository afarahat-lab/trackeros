import request from 'supertest';
import express from 'express';
import versionRouter from '../../src/modules/version/version.routes';

const app = express();
app.use('/api/v1', versionRouter);

describe('GET /api/v1/version', () => {
    it('should return the current version from package.json', async () => {
        const response = await request(app).get('/api/v1/version');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('version');
    });
});
