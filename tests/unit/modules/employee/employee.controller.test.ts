import { EmployeeController } from '../../../../src/modules/employee/employee.controller';
import { IEmployeeService } from '../../../../src/modules/employee/employee.service';
import { FastifyRequest, FastifyReply } from 'fastify';
import { Employee } from '../../../../src/modules/employee/employee.model';

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
      listEmployees: jest.fn()
    };
    controller = new EmployeeController(mockService);
    mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
  });

  it('getEmployee should return 200 and employee if found', async () => {
    const mockEmployee = { id: '123e4567-e89b-12d3-a456-426614174000' } as Employee;
    mockService.getEmployee.mockResolvedValue(mockEmployee);
    mockRequest = { params: { id: '123e4567-e89b-12d3-a456-426614174000' } };

    await controller.getEmployee(mockRequest as FastifyRequest, mockReply as FastifyReply);

    expect(mockService.getEmployee).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
    expect(mockReply.send).toHaveBeenCalledWith(mockEmployee);
  });

  it('getEmployee should return 404 if not found', async () => {
    mockService.getEmployee.mockResolvedValue(null);
    mockRequest = { params: { id: '123e4567-e89b-12d3-a456-426614174000' } };

    await controller.getEmployee(mockRequest as FastifyRequest, mockReply as FastifyReply);

    expect(mockReply.status).toHaveBeenCalledWith(404);
    expect(mockReply.send).toHaveBeenCalledWith({ error: 'Employee not found' });
  });

  it('getEmployee should return 400 for invalid UUID', async () => {
    mockRequest = { params: { id: 'invalid-uuid' } };

    await controller.getEmployee(mockRequest as FastifyRequest, mockReply as FastifyReply);

    expect(mockReply.status).toHaveBeenCalledWith(400);
  });

  it('getEmployees should return 200 and employees', async () => {
    const mockEmployees = [{ id: '1' }] as Employee[];
    mockService.listEmployees.mockResolvedValue(mockEmployees);
    mockRequest = { query: {} };

    await controller.getEmployees(mockRequest as FastifyRequest, mockReply as FastifyReply);

    expect(mockService.listEmployees).toHaveBeenCalled();
    expect(mockReply.send).toHaveBeenCalledWith(mockEmployees);
  });

  it('getSubordinates should return 200 and subordinates', async () => {
    const mockSubordinates = [{ id: '2' }] as Employee[];
    mockService.getSubordinates.mockResolvedValue(mockSubordinates);
    mockRequest = { params: { id: '123e4567-e89b-12d3-a456-426614174000' } };

    await controller.getSubordinates(mockRequest as FastifyRequest, mockReply as FastifyReply);

    expect(mockService.getSubordinates).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
    expect(mockReply.send).toHaveBeenCalledWith(mockSubordinates);
  });
});
