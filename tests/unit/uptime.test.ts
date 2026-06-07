import { getUptime } from "../../src/modules/uptime/uptime";

describe("getUptime", () => {
    it("should return the process uptime in seconds", () => {
        const result = getUptime();
        expect(result).toHaveProperty("uptime");
        expect(typeof result.uptime).toBe("number");
    });
});
