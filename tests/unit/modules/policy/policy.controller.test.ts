import { PolicyController } from '../../../../src/modules/policy/policy.controller';
import { IPolicyService } from '../../../../src/modules/policy/policy.service';

describe('PolicyController', () => {
  let controller: PolicyController;
  let mockService: jest.Mocked<IPolicyService>;
  let mockRequest: any;
  let mockReply: any;

  beforeEach(() => {
    mockService = {
      getPolicy: jest.fn(),
      getPolicies: jest.fn(),
      createPolicy: jest.fn(),
      updatePolicy: jest.fn(),
      deletePolicy: jest.fn(),
      validateEntitlement: jest.fn()
    };
    controller = new PolicyController(mockService);
    mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
    mockRequest = {
      params: {},
      body: {},
      user: { id: 'user1' }
    };
  });

  it('should return 404 if policy not found', async () => {
    mockRequest.params = { id: '123e4567-e89b-12d3-a456-426614174000' };
    mockService.getPolicy.mockResolvedValue(null);
    
    await controller.getPolicy(mockRequest, mockReply);
    
    expect(mockReply.status).toHaveBeenCalledWith(404);
    expect(mockReply.send).toHaveBeenCalledWith({ message: 'Policy not found' });
  });

  it('should return 400 for invalid params', async () => {
    mockRequest.params = { id: 'invalid-uuid' };
    
    await controller.getPolicy(mockRequest, mockReply);
    
    expect(mockReply.status).toHaveBeenCalledWith(400);
  });

  it('should create policy and return 201', async () => {
    mockRequest.body = {
      policyName: 'Test',
      leaveType: 'annual',
      entitlementDays: 10
    };
    const newPolicy = { id: '1', ...mockRequest.body };
    mockService.createPolicy.mockResolvedValue(newPolicy as any);
    
    await controller.createPolicy(mockRequest, mockReply);
    
    expect(mockService.createPolicy).toHaveBeenCalledWith(mockRequest.body, 'user1');
    expect(mockReply.status).toHaveBeenCalledWith(201);
    expect(mockReply.send).toHaveBeenCalledWith(newPolicy);
  });
});
