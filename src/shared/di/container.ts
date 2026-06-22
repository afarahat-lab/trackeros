import { LeaveService } from '../../modules/leave/leave.service';
import { BalanceService } from '../../modules/balance/balance.service';
import { EmployeeService } from '../../modules/employee/employee.service';
import { LeaveRequestRepository } from '../../modules/leave/leave.repository';
import { LeaveBalanceRepository } from '../../modules/balance/balance.repository';
import { EmployeeRepository } from '../../modules/employee/employee.repository';
import { LeaveController } from '../../modules/leave/leave.controller';
import { registerLeaveRoutes } from '../../modules/leave/leave.routes';

interface FastifyInstance {
  db: any;
  [key: string]: any;
}

export function setupContainer(fastify: FastifyInstance): void {
  const leaveRepository = new LeaveRequestRepository(fastify.db);
  const balanceRepository = new (LeaveBalanceRepository as any)(fastify.db);
  const employeeRepository = new EmployeeRepository(fastify.db);

  const leaveService = new LeaveService(
    leaveRepository,
    null as any,
    null as any,
    null as any,
    null as any,
    null as any
  );
  const balanceService = new BalanceService(
    balanceRepository,
    null as any,
    null as any,
    null as any
  );
  const employeeService = new EmployeeService(employeeRepository);

  const leaveController = new LeaveController(leaveService, balanceService);

  registerLeaveRoutes(fastify as any, leaveController);
}
