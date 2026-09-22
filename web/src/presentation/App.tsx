import type { ComponentProps } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../modules/auth/index';
import type { IEmployeeService } from '../modules/employee/index';
import type { IBalanceService, ILeaveService } from '../modules/leave/index';
import type { IApprovalsService } from '../modules/approvals/index';
import { RequireAuth } from './guards/RequireAuth';
import { RequireApprover } from './guards/RequireApprover';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { LeaveListPage } from './pages/LeaveListPage';
import { LeaveDetailPage } from './pages/LeaveDetailPage';
import { RequestLeavePage } from './pages/RequestLeavePage';
import { ApprovalsPage } from './pages/ApprovalsPage';

type AuthProviderProps = ComponentProps<typeof AuthProvider>;

export interface AppProps {
  authService: AuthProviderProps['authService'];
  tokenStorage: AuthProviderProps['tokenStorage'];
  apiClient: AuthProviderProps['apiClient'];
  employeeService: IEmployeeService;
  leaveService: ILeaveService;
  balanceService: IBalanceService;
  approvalsService: IApprovalsService;
}

/**
 * The application router. Wraps every route in {@link AuthProvider} so pages
 * and guards resolve the current session through `useAuth()`. Route services
 * are injected from the composition root (`main.tsx`), keeping the
 * presentation module free of any `api-client` dependency.
 */
export function App({
  authService,
  tokenStorage,
  apiClient,
  employeeService,
  leaveService,
  balanceService,
  approvalsService,
}: AppProps) {
  return (
    <BrowserRouter>
      <AuthProvider
        authService={authService}
        tokenStorage={tokenStorage}
        apiClient={apiClient}
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <DashboardPage
                  employeeService={employeeService}
                  balanceService={balanceService}
                />
              </RequireAuth>
            }
          />
          <Route
            path="/leaves"
            element={
              <RequireAuth>
                <LeaveListPage leaveService={leaveService} />
              </RequireAuth>
            }
          />
          <Route
            path="/leaves/new"
            element={
              <RequireAuth>
                <RequestLeavePage leaveService={leaveService} />
              </RequireAuth>
            }
          />
          <Route
            path="/leaves/:id"
            element={
              <RequireAuth>
                <LeaveDetailPage
                  leaveService={leaveService}
                  employeeService={employeeService}
                />
              </RequireAuth>
            }
          />
          <Route
            path="/approvals"
            element={
              <RequireAuth>
                <RequireApprover>
                  <ApprovalsPage approvalsService={approvalsService} />
                </RequireApprover>
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
