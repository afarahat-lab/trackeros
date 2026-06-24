import http from 'http';
import app from '../../../../src/app';

describe('Status Module', () => {
  let server: http.Server;
  let port: number;

  beforeAll((done) => {
    server = app.listen(0, () => {
      port = (server.address() as any).port;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('GET /status', () => {
    it('should return 200 and status ok', (done) => {
      http.get(`http://localhost:${port}/status`, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            expect(res.statusCode).toBe(200);
            expect(JSON.parse(data)).toEqual({ status: 'ok' });
            done();
          } catch (err) {
            done(err);
          }
        });
      }).on('error', done);
    });
  });
});
