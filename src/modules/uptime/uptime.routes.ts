import { Router } from "express";
import { getUptime } from "./uptime";
import { UptimeResponse } from "src/shared/types/index";

const router = Router();

router.get("/uptime", (req, res) => {
    const uptimeResponse: UptimeResponse = getUptime();
    res.json(uptimeResponse);
});

export default router;
