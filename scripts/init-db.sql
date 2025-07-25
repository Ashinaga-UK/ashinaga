-- Initialize the database with any required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create a test connection to ensure the database is working
SELECT 'Database initialized successfully' as status;