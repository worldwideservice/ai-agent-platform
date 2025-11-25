-- Create KB Import Job table
CREATE TABLE IF NOT EXISTS kb_import_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  progress INTEGER DEFAULT 0 NOT NULL,
  current_step TEXT,

  -- Input data
  files_uploaded INTEGER NOT NULL,
  total_size INTEGER NOT NULL,

  -- Results
  categories_created INTEGER,
  articles_created INTEGER,
  embeddings_generated INTEGER,

  -- Metadata
  analysis TEXT,
  errors TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS kb_import_jobs_user_id_idx ON kb_import_jobs(user_id);
CREATE INDEX IF NOT EXISTS kb_import_jobs_status_idx ON kb_import_jobs(status);

-- Create KB Uploaded File table
CREATE TABLE IF NOT EXISTS kb_uploaded_files (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES kb_import_jobs(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  storage_key TEXT NOT NULL,

  extracted_text TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS kb_uploaded_files_job_id_idx ON kb_uploaded_files(job_id);
