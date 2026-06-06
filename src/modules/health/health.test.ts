import request from 'supertest';
import app from '../../index'; // Adjust the path as necessary

describe('Health Check Endpoint', () => {
    it('should return 200 and status OK', async () => {
        const response = await request(app).get('/api/v1/health-check');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'OK' });
    });
});
