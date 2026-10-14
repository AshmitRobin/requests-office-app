# Requests Office — Full-stack internship assignment

 React + Vite frontend, Node.js + Express API, MySQL database, JWT login, role-based access, request workflow and document upload validation.

## Roles and workflow
- Requester: create requests, upload supporting files, see own requests, respond to coordinator's correction request, confirm they have seen a decision.
- Coordinator: see all requests, review documents, ask for corrections, forward to specialist, record a decision.
- Specialist: see only requests sent for expert review, add expert notes and recommendation.
- A request is closed only after the requester confirms they have seen the decision.

## Requirements
- Node.js 20+ and npm
- MySQL 8+
- VS Code and Command Prompt

## 1. Database
Create a MySQL database and run `database/schema.sql` in MySQL Workbench or CMD:
```sql
SOURCE C:/path/to/requests-office-app/database/schema.sql;
```
Or copy/paste the SQL into MySQL Workbench. Then configure backend `.env` as described below.

## 2. Backend
Open CMD in `backend`:
```cmd
npm install
```
Copy `.env.example` to `.env`, then edit DB settings and JWT_SECRET.
```cmd
copy .env.example .env
npm run seed
npm run dev
```
API runs at http://localhost:5000. `npm run seed` creates the four demo users and three sample requests. It is safe to run again for these demo accounts.

## 3. Frontend
Open a second CMD in `frontend`:
```cmd
npm install
```
Create `.env` by copying `.env.example`:
```cmd
copy .env.example .env
npm run dev
```
Open the Vite URL shown, normally http://localhost:5173.

## Demo accounts
Password for all demo users: `Demo@12345`
- Coordinator: coordinator@demo.org
- Specialist: specialist@demo.org
- Main-campus requester: requester.main@demo.org
- North-campus requester: requester.north@demo.org

These are demo credentials only. Change them before real use.

## Workflow demo
1. Log in as a requester and create a request. Upload only readable, permitted files under 10 MB each.
2. Log in as coordinator. Open the request and either ask for corrections or send it for specialist review.
3. Log in as specialist. Add a recommendation and return it to the coordinator.
4. Coordinator records the decision.
5. Requester confirms seeing the decision. The request is then closed.

## Important scope notes
- The UI uses a simple single dashboard with role-specific actions instead of three separate codebases.
- Uploads are stored on the backend server's local disk in this demo. Local disk on many cloud hosts is ephemeral; for production, use object storage such as S3/Cloudinary and add malware scanning.
- For public deployment, configure CORS to your exact frontend URL, use a strong JWT secret, and never seed demo accounts in production.
- The assignment asks for an organisation email. This demo checks that an email is syntactically valid; it does not verify domain ownership or send verification emails. Add an approved organisation-domain allowlist if the office provides the exact domain.
