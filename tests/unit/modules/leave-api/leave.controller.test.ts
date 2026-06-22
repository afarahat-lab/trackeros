import { LeaveController } from '../../../../src/modules/leave-api/leave.controller';
import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateLeaveRequestApiDto } from '../../../../src/modules/leave-api/leave.dto';

describe('LeaveController', () => {
  it('should map API DTO to Domain DTO correctly', async () => {
    const mockService = {
      submitLeaveRequest: jest.fn().mockResolvedValue({ id: '1' }),
    };
    const controller = new LeaveController(mockService as any);

    const mockRequest = {
      body: {
        employeeId: 'emp1',
        leaveTypeId: 'type1',
        startDate: '2023-01-01',
        endDate: '2023-01-02',
        reason: 'test',
      } as CreateLeaveRequestApiDto,
      user: { id: 'emp1', role: 'employee' },
    } as unknown as FastifyRequest<{ Body: CreateLeaveRequestApiDto }>;

    const mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    } as unknown as FastifyReply;

    await controller.submitLeaveRequest(mockRequest, mockReply);

    expect(mockService.submitLeaveRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: 'emp1',
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      }),
      { id: 'emp1', role: 'employee' }
    );
  });
});
