export interface IHealthService {
  ping(): Promise<string>;
}
