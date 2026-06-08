import express from 'express';
import bodyParser from 'body-parser';
import { leaveRoutes } from './modules/leave/leave.routes';
import { employeeRoutes } from './modules/employee/employee.routes';
import { policyRoutes } from './modules/policy/policy.routes';
import { balanceRoutes } from './modules/balance/balance.routes';

const app = express();
app.use(bodyParser.json());

app.use('/api/v1/leaves', leaveRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/policies', policyRoutes);
app.use('/api/v1/balances', balanceRoutes);

app.get('/api/v1/uptime', (req, res) => {
    const uptimeInSeconds = process.uptime();
    res.json({ uptime: uptimeInSeconds });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
