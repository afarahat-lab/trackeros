import React from 'react';
import { createRoot } from 'react-dom/client';
import { ApiClient, TokenStorage } from './infrastructure/api/index';
import { AuthService } from './modules/auth/index';
import { EmployeeService } from './modules/employee/index';
import { BalanceService, LeaveService } from './modules/leave/index';
import { App } from './presentation/index';

const tokenStorage = new TokenStorage();
const apiClient = new ApiClient(tokenStorage);
const authService = new AuthService(apiClient, tokenStorage);
const employeeService = new EmployeeService(apiClient);
const leaveService = new LeaveService(apiClient);
const balanceService = new BalanceService(apiClient);

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App
      authService={authService}
      tokenStorage={tokenStorage}
      apiClient={apiClient}
      employeeService={employeeService}
      leaveService={leaveService}
      balanceService={balanceService}
    />
  </React.StrictMode>
);
