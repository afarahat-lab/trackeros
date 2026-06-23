import { EmployeeController } from '../../../../src/modules/employee/employee.controller';
import { IEmployeeService } from '../../../../src/modules/employee/employee.service';
import { FastifyRequest, FastifyReply } from 'fastify';

describe('EmployeeController', () => {
  let controller: EmployeeController;
  let mockService: jest.Mocked<IEmployeeService>;
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    mockService = {
      getEmployee: jest.fn(),
      getEmployeeByNumber: jest.fn(),
      getSubordinates: jest.fn(),
      isActive: jest.fn(),
      listEmployees: jest.fn(),
    };
    controller = new EmployeeController(mockService);
    mockRequest = { params: {}, query: {} };
    mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
  });

  it('getEmployee returns 404 when not found', async () => {
    mockRequest.params = { id: '123e4567-e89b-12d3-a456-426614174000' };
    mockService.getEmployee.mockResolvedValue(null);
    await controller.getEmployee(mockRequest as FastifyRequest, mockReply as FastifyReply);
    expect(mockReply.status).toHaveBeenCalledWith(404);
    expect(mockReply.send).toHaveBeenCalledWith({ message: 'Employee not found' });
  });

  it('getEmployee returns employee', async () => {
    const employee = { id: '1', first_name: 'John' };
    mockRequest.params = { id: '123e4567-e89b-12d3-a456-426614174000' };
    mockService.getEmployee.mockResolvedValue(employee as any);
    await controller.getEmployee(mockRequest as FastifyRequest, mockReply as FastifyReply);
    expect(mockReply.send).toHaveBeenCalledWith(employee);
  });

  it('getEmployees returns list', async () => {
    mockRequest.query = {};
    const list = [{ id: '1' }];
    mockService.listEmployees.mockResolvedValue(list as any);
    await controller.getEmployees(mockRequest as FastifyRequest, mockReply as FastifyReply);
    expect(mockReply.send).toHaveBeenCalledWith(list);
  });

  it('getSubordinates returns list', async () => {
    mockRequest.params = { id: '123e4567-e89b-12d3-a456-426614174000' };
    const subs = [{ id: '2' }];
    mockService.getSubordinates.mockResolvedValue(subs as any);
    await controller.getSubordinates(mockRequest as FastifyRequest, mockReply as FastifyReply);
    expect(mockReply.send).toHaveBeenCalledWith(subs);
  });
});
