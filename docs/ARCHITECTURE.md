# Architecture — trackeros

## Overview

The architecture is modular, with a clear separation of concerns between models, repositories, services, controllers, and routes. The backend is built using Fastify for performance, while the frontend leverages React Native for mobile and React for web, sharing contracts for type safety.

## Leave Management Domain Additions

### Supported Leave Types
- ANNUAL
- SICK
- EMERGENCY

### Leave Request Status Lifecycle
- PENDING
- APPROVED
- REJECTED
