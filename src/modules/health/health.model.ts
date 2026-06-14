export interface ProcessUptime {
  startTime: Date;
  currentTime: Date;
  uptimeSeconds: number;
}

export function calculateUptime(startTime: Date): ProcessUptime {
  const currentTime = new Date();
  const uptimeSeconds = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
  return { startTime, currentTime, uptimeSeconds };
}
