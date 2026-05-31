import { Props } from './props';

/**
 * Represents a component entity.
 */
export interface Component {
  id: string;
  name: string;
  description?: string;
  props: Props;
  typeId: string;
}
