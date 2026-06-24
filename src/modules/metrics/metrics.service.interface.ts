import { MetricsResponse } from "./metrics.model";

export interface IMetricsService {
  getMetrics(): Promise<MetricsResponse>;
  resetMetrics(): Promise<MetricsResponse>;
}
