# Domain Model — trackeros

To be populated as the design-agent and context-agent learn the domain.

## Components

### WelcomeScreen
- **Type**: Page
- **Description**: Displays a welcome message and a start button. Clicking the start button shows a message that the system is yet to be developed.
- **Props**: {}

### StartButton
- **Type**: Component
- **Description**: A button that, when clicked, displays a message indicating the system is yet to be developed.
- **Props**: {}

## Entities

### Props
- **Fields**:
  - **name**: string (required)
  - **value**: string (required)
- **Relationships**: None

## API Contracts

### GET /api/v1/props
- **Description**: Retrieve a list of all props
- **Request Body**: {}
- **Response Body**: { "props": "Array<Props>" }
- **Auth Required**: true
- **Roles**: admin, operator

### POST /api/v1/props
- **Description**: Create a new prop
- **Request Body**: { "name": "string", "value": "string" }
- **Response Body**: { "prop": "Props" }
- **Auth Required**: true
- **Roles**: admin
