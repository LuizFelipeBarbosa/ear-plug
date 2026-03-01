# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security seriously at Ear-Plug. If you discover a security vulnerability, please follow these steps:

### Do NOT

- Open a public GitHub issue for security vulnerabilities
- Disclose the vulnerability publicly before it has been addressed

### Do

1. **Submit a private security advisory** at **https://github.com/LuizFelipeBarbosa/ear-plug/security/advisories/new** with:
   - A description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact assessment
   - Any suggested fixes (optional)

2. **Allow time for response** - We aim to acknowledge receipt within 48 hours and provide a more detailed response within 7 days.

3. **Coordinate disclosure** - We'll work with you to understand and address the issue before any public disclosure.

## Security Considerations

### Authentication

- User authentication is handled by [Clerk](https://clerk.com), a SOC 2 Type II certified authentication provider
- JWT tokens are used for secure communication between the frontend and Convex backend
- All authentication routes are protected via middleware

### Data Protection

- All data is stored in [Convex](https://convex.dev), which provides encryption at rest and in transit
- User passwords are never stored directly - authentication is delegated to Clerk
- Sensitive API keys are stored as environment variables, never committed to the repository

### API Security

- Sensitive Convex mutations require authentication via JWT; public discovery queries (events, venues, bands) are intentionally unauthenticated
- Clerk webhooks are verified using SVIX signatures via the `svix` library
- Administrative mutations (seed, migrations) are restricted to internal-only (not client-callable)
- Role-based access control (RBAC) restricts actions based on user roles (fan/musician) and band membership roles (owner/admin/member)
- Notification and user-specific mutations include ownership verification to prevent IDOR attacks

### Best Practices

When contributing to Ear-Plug, please:

- Never commit API keys, secrets, or credentials
- Use environment variables for all sensitive configuration
- Validate all user inputs using Zod schemas
- Follow the principle of least privilege for database access

## Acknowledgments

We appreciate the security research community's efforts in helping keep Ear-Plug and its users safe.
