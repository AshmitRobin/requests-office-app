# Requests Office

Requests Office is a full-stack web application developed for the **Centre for Artificial Intelligence Full Stack Development Internship Assignment**.

The application simplifies request management across multiple campuses by bringing request submission, document handling, reviews, and status tracking into a single platform.

## Features

- **Role-Based Login:** Separate access for requesters, coordinators, and specialists.
- **Request Submission:** Submit requests with relevant details, department information, and supporting documents.
- **Document Management:** Upload supporting files for review.
- **Request Review:** Review requests, request corrections, and forward requests through the workflow.
- **Specialist Review:** Enable specialists to review requests and provide recommendations.
- **Decision Management:** Record final decisions and allow requesters to confirm that they have seen them.
- **Status Tracking:** Track requests throughout their lifecycle.
- **Activity Logs:** Maintain a history of important request-related actions.

## Tech Stack

| Technology | Purpose |
|---|---|
| React | Frontend user interface |
| Vite | Frontend development and build tool |
| Node.js | Backend runtime |
| Express.js | Backend API |
| MySQL | Database |
| JWT | Authentication |
| Multer | Document uploads |

## Live Links

- **Application:** [Requests Office](https://requests-office-app-nu.vercel.app)
- **Backend API:** [Requests Office API](https://requests-office-app.onrender.com)
- **GitHub Repository:** [requests-office-app](https://github.com/AshmitRobin/requests-office-app)

## Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/)
- [MySQL](https://dev.mysql.com/downloads/)
- [Git](https://git-scm.com/)

### 1. Clone the Repository

```bash
git clone https://github.com/AshmitRobin/requests-office-app.git
cd requests-office-app
```

### 2. Set Up the Database

Open MySQL and execute the SQL script provided in:

```text
database/schema.sql
```

This creates the database and tables required by the application.

### 3. Configure the Backend

Open a terminal and run:

```bash
cd backend
npm install
```

Create a `.env` file using `.env.example` as a template. Configure the required environment variables, including your MySQL connection details, JWT secret, frontend URL, and upload directory.

**Important:** Never commit your `.env` file or expose database passwords and JWT secrets in a public repository.

### 4. Start the Backend

From the `backend` directory, run:

```bash
npm start
```

### 5. Configure and Start the Frontend

Open a separate terminal:

```bash
cd frontend
npm install
```

Configure the frontend API URL in the frontend environment file as required by your setup.

Start the development server:

```bash
npm run dev
```

Open the local URL displayed in your terminal to access the application.

## Demo Accounts

Demo accounts are available on the application's login page. Use the provided demo credentials to explore the different role-based dashboards and request workflows.

## Application Workflow

1. A requester submits a request with the required details and supporting documents.
2. The coordinator reviews the request and requests corrections if necessary.
3. The coordinator forwards the request for specialist review.
4. The specialist reviews the request and provides recommendations.
5. The coordinator records the final decision.
6. The requester confirms that they have seen the decision, completing the workflow.

## Project Objective

The objective of Requests Office is to improve request management by centralizing submissions, supporting documents, reviews, decisions, and activity tracking in one web application.

## Internship Assignment

Developed as part of the **Centre for Artificial Intelligence Full Stack Development Internship Assignment**.
