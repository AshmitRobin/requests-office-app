CREATE DATABASE IF NOT EXISTS requests_office CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE requests_office;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('requester','coordinator','specialist') NOT NULL,
  campus ENUM('main','north','city') NULL,
  department VARCHAR(120) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  requester_id INT NOT NULL,
  campus ENUM('main','north','city') NOT NULL,
  department VARCHAR(120) NOT NULL,
  title VARCHAR(180) NOT NULL,
  category VARCHAR(100) NOT NULL,
  people_involved TEXT NULL,
  amount DECIMAL(12,2) NULL,
  description TEXT NOT NULL,
  status ENUM(
    'submitted','needs_correction','under_review','with_specialist',
    'specialist_returned','decision_made','completed'
  ) NOT NULL DEFAULT 'submitted',
  coordinator_note TEXT NULL,
  specialist_note TEXT NULL,
  decision TEXT NULL,
  requester_confirmation_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_request_user FOREIGN KEY (requester_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  size_bytes INT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_document_request FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  actor_id INT NOT NULL,
  action VARCHAR(120) NOT NULL,
  note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_log_request FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_log_actor FOREIGN KEY (actor_id) REFERENCES users(id)
);
