# Architecture Decisions — trackeros

## ADR-001 — Project initialised

Date: 2026-06-04
Status: Accepted

Decision: Project initialised via the Gestalt platform.
Description: A corporate leave management system for a mid-size company.
Employees can apply for different types of leave: annual, sick, and emergency.
Managers can approve or reject leave requests with comments.
HR administrators can configure leave policies, view team calendars, and generate reports.
The system must enforce leave balance limits and prevent overlapping requests.
Built with TypeScript, Node.js, Express, PostgreSQL, and npm.
Uses Jest for testing.
Stack: TypeScript / Node.js / React / PostgreSQL
Architecture: Modular monolith (corporate-ops-web-mobile template, tier 1)
