import { policyRoutes } from '../../../../src/modules/policy/policy.routes';
import { IPolicyService } from '../../../../src/modules/policy/policy.service';

describe('policyRoutes', () => {
  let mockFastify: any;
  let mockService: jest.Mocked<IPolicyService>;

  beforeEach(() => {
    mockFastify = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn()
    };
    mockService = {} as any;
  });

  it('should register all policy routes', async () => {
    await policyRoutes(mockFastify, mockService);
    
    expect(mockFastify.get).toHaveBeenCalledTimes(2);
    expect(mockFastify.post).toHaveBeenCalledTimes(1);
    expect(mockFastify.put).toHaveBeenCalledTimes(1);
    
    expect(mockFastify.get).toHaveBeenCalledWith('/policies/:id', expect.any(Object), expect.any(Function));
    expect(mockFastify.get).toHaveBeenCalledWith('/policies', expect.any(Object), expect.any(Function));
    expect(mockFastify.post).toHaveBeenCalledWith('/policies', expect.any(Object), expect.any(Function));
    expect(mockFastify.put).toHaveBeenCalledWith('/policies/:id', expect.any(Object), expect.any(Function));
  });
});
