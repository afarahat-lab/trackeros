import { registerLeaveRoutes } from '../../../../src/modules/leave/leave.routes';

describe('registerLeaveRoutes', () => {
  let mockFastify: any;
  let mockController: any;

  beforeEach(() => {
    mockFastify = {
      post: jest.fn(),
      put: jest.fn(),
      get: jest.fn(),
      authenticate: jest.fn(),
      authorize: jest.fn(),
    };

    mockController = {
      applyLeave: jest.fn(),
      approveLeave: jest.fn(),
      rejectLeave: jest.fn(),
      cancelLeave: jest.fn(),
      getLeaveRequest: jest.fn(),
      getLeaveRequests: jest.fn(),
      getLeaveBalance: jest.fn(),
    };
  });

  it('should register all leave routes with correct methods and paths', () => {
    registerLeaveRoutes(mockFastify, mockController as any);

    expect(mockFastify.post).toHaveBeenCalledWith(
      '/apply',
      expect.objectContaining({ schema: expect.any(Object) }),
      expect.any(Function)
    );

    expect(mockFastify.put).toHaveBeenCalledWith(
      '/approve/:id',
      expect.objectContaining({ schema: expect.any(Object) }),
      expect.any(Function)
    );

    expect(mockFastify.put).toHaveBeenCalledWith(
      '/reject/:id',
      expect.objectContaining({ schema: expect.any(Object) }),
      expect.any(Function)
    );

    expect(mockFastify.put).toHaveBeenCalledWith(
      '/cancel/:id',
      expect.objectContaining({ schema: expect.any(Object) }),
      expect.any(Function)
    );

    expect(mockFastify.get).toHaveBeenCalledWith(
      '/:id',
      expect.objectContaining({ schema: expect.any(Object) }),
      expect.any(Function)
    );

    expect(mockFastify.get).toHaveBeenCalledWith(
      '/',
      expect.objectContaining({ schema: expect.any(Object) }),
      expect.any(Function)
    );

    expect(mockFastify.get).toHaveBeenCalledWith(
      '/balance',
      expect.objectContaining({ schema: expect.any(Object) }),
      expect.any(Function)
    );
  });

  it('should bind controller methods correctly as handlers', () => {
    registerLeaveRoutes(mockFastify, mockController as any);
    
    const postCall = mockFastify.post.mock.calls[0];
    const handler = postCall[2];
    
    expect(typeof handler).toBe('function');
  });
});
