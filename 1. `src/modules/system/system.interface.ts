export interface ProcessInfo {
  pid: number;
}

export interface ISystemService {
  getProcessInfo(): Promise<ProcessInfo>;
}
