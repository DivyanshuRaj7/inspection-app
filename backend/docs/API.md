# API Documentation

All endpoints are prefixed with `/api/v1`.
All requests/responses use JSON format.
Authenticated endpoints require a valid JWT passed in the header: `Authorization: Bearer <token>`

## Health
- `GET /health` : Returns system health.

## Auth
- `POST /auth/login` : Authenticate user. Expects `email` and `password`. Returns JWT and sanitized user data.
- `GET /auth/me` : Returns current authenticated user.
- `POST /auth/logout` : Logout user.

## Rules
- `GET /rules/active` : Get current active rule configuration. (Requires Auth)
- `GET /rules/versions` : Get list of all rule versions. (Requires Auth)
- `GET /rules/versions/:version` : Get specific rule configuration by version string. (Requires Auth)

## Sync
- `POST /sync/inspections` : Offline-first synchronization endpoint. See `INTEGRATION_CONTRACTS.md`. (Requires INSPECTOR or ADMIN)

## Inspections
- `GET /inspections` : List inspections with pagination. (Requires Auth)
- `GET /inspections/:id` : Get single inspection details. (Requires Auth)
- `PATCH /inspections/:id` : Update inspection. Requires optimistic concurrency control with `server_version`. (Requires INSPECTOR or ADMIN)
- `POST /inspections/:id/submit` : Submit DRAFT inspection for review. (Requires INSPECTOR or ADMIN)
- `GET /inspections/:id/events` : Get audit log of inspection events. (Requires Auth)
- `POST /inspections/:id/compliance-result` : Attach Rule Engine result to inspection. (Requires ADMIN or Internal Service Role)
- `GET /inspections/:id/report-data` : Retrieve formatted data for Document Generation. (Requires Auth)

## Dashboard
- `GET /dashboard/summary` : Dashboard summary stats. (Requires OFFICIAL or ADMIN)
- `GET /dashboard/violations` : Dashboard violation stats. (Requires OFFICIAL or ADMIN)
- `GET /dashboard/inspectors` : List active inspectors. (Requires OFFICIAL or ADMIN)

## Response Format
Success:
\`\`\`json
{
  "success": true,
  "data": { ... },
  "meta": { ... }
}
\`\`\`

Error:
\`\`\`json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": []
  },
  "requestId": "uuid"
}
\`\`\`
