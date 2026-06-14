export interface ProcessUptime {
  startTime: Date;
  currentTime: Date;
  uptimeSeconds: number;
  getUptime(): number;
}
