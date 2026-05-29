import { describe, it, expect, vi } from 'vitest';
import { DescriptionService } from '../service/description-service';
import { DescriptionRepository } from '../repository/description-repository';

vi.mock('../repository/description-repository');

const MockDescriptionRepository = vi.mocked(DescriptionRepository);

const mockDescriptions = [{ id: '1', title: 'Title 1', content: 'Content 1' }];

MockDescriptionRepository.prototype.getAll.mockResolvedValue(mockDescriptions);

describe('SC-1: Description Service', () => {
  it('should get all descriptions using the repository', async () => {
    const repository = new MockDescriptionRepository();
    const service = new DescriptionService(repository);

    const descriptions = await service.getAllDescriptions();

    expect(descriptions).toEqual(mockDescriptions);
    expect(repository.getAll).toHaveBeenCalled();
  });

  it('should handle errors from the repository', async () => {
    MockDescriptionRepository.prototype.getAll.mockRejectedValue(new Error('Repository error'));

    const repository = new MockDescriptionRepository();
    const service = new DescriptionService(repository);

    await expect(service.getAllDescriptions()).rejects.toThrow('Repository error');
  });
});
