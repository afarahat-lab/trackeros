import { Router } from 'express';
import { getVersion } from './version.controller';

const router = Router();

router.get('/version', (req, res) => {
    res.json(getVersion());
});

export default router;
