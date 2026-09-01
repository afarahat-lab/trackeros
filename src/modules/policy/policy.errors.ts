import { RepositoryError } from '../employee/index';

export class PolicyNotFoundError extends RepositoryError {
  constructor(id: string) {
    super('POLICY_NOT_FOUND', `Leave policy with id '${id}' not found`);
    this.name = 'PolicyNotFoundError';
  }
}
