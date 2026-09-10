/**
 * Pure value object describing the outcome of a validation rule. It reports
 * only whether validation passed and the list of failure reasons; it performs
 * no side effects and never throws. The {@link ValidationService} decides
 * whether to surface a typed {@link AppError} from a failed result.
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
