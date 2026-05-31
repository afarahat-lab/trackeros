# Admin README

## Starting the Application

To start the application, follow these steps:

1. **Install Dependencies**: Ensure you have `pnpm` installed. Run `pnpm install` to install all necessary packages.

2. **Configuration**: Ensure that all necessary configurations are set up in the configuration module. Avoid using `process.env` directly.

3. **Database Setup**: Make sure your PostgreSQL database is running and accessible. Run any necessary migrations using the provided scripts.

4. **Start the Server**: Run `pnpm start` to start the Fastify server.

5. **Access the Application**: The application should be running on the configured port. Access it via your web browser.

## Important Notes

- **RBAC**: Role-based access control is enforced via middleware. Ensure roles are correctly set up in the auth module.

- **Audit Logs**: All state-changing operations will produce an audit record. Ensure that the audit log is correctly configured.

- **Logging**: Use the platform logger for logging. Avoid using `console.log`.

- **Input Validation**: All inputs are validated using Zod schemas at the API boundary.

- **Sensitive Data**: Ensure no sensitive data is logged or exposed in any way.