import { Props } from '../domain/props';
import { PropsRepository } from '../repository/props-repository';

/**
 * Service for managing props business logic.
 */
export class PropsService {
  private repository: PropsRepository;

  constructor(repository: PropsRepository) {
    this.repository = repository;
  }

  /**
   * Retrieves all props.
   * @returns {Promise<Props[]>} A promise that resolves to an array of props.
   */
  async getAllProps(): Promise<Props[]> {
    return this.repository.getAll();
  }

  /**
   * Creates a new prop.
   * @param {Props} prop - The prop to create.
   * @returns {Promise<Props>} A promise that resolves to the created prop.
   */
  async createProp(prop: Props): Promise<Props> {
    return this.repository.create(prop);
  }
}
