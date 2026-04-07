# Hippo Tasks Backend 🦛

The server-side application for Hippo Tasks, built with Node.js, Express, and Mongoose.

## Tech Stack
- **Node.js**: Runtime environment
- **Express**: Web framework
- **MongoDB**: Database (using Mongoose ODM)
- **CORS**: Cross-Origin Resource Sharing
- **Dotenv**: Environment variable management

## Setup Instructions

1.  **Clone the repository**: (If applicable)
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Environment Configuration**:
    Create a `.env` file in the root and add your MongoDB connection string:
    ```env
    PORT=5000
    MONGO_URI=your_mongodb_atlas_uri
    ```
4.  **Start the server**:
    ```bash
    node server.js
    ```

## API Endpoints

- **GET /api/tasks**: Fetch all tasks.
- **POST /api/tasks**: Create a new task.
- **PUT /api/tasks/:id**: Update task's completion status.
- **DELETE /api/tasks/:id**: Delete a task.
