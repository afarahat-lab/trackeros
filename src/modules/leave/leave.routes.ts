import express from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';

const router = express.Router();

router.get('/api/v1/version', (req, res) => {
    const packageJsonPath = join(__dirname, '../../../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    res.json({ version: packageJson.version });
});

export default router;
