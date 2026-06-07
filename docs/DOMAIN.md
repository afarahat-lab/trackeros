# Domain Model — trackeros

To be populated as the design-agent and context-agent learn the domain.

## API Contracts

### GET /api/v1/health
- **Description**: Returns the health status of the application.
- **Request Body**: None
- **Response Body**:
  - `status`: string
- **Auth Required**: No
- **Roles**: None

### GET /api/v1/version
- **Description**: Retrieves the current version of the application from package.json.
- **Request Body**: None
- **Response Body**:
  - `version`: string
- **Auth Required**: No
- **Roles**: None
