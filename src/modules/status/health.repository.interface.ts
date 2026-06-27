export interface IHealthRepository {
  checkDatabaseConnection(): Promise<boolean>;
}
