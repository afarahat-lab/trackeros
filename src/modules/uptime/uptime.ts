export function getUptime(): { uptime: number } {
    return { uptime: Math.floor(process.uptime()) };
}
