PRAGMA foreign_keys = ON;

-- Applications
CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY,
  company TEXT NOT NULL,
  role TEXT,
  status TEXT CHECK (status IN (
    'Planned','Applied','Interviewing','Offer','Hired','Rejected','On Hold'
  )) DEFAULT 'Planned',
  url TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Contacts linked to an application
CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY,
  application_id INTEGER NOT NULL,
  name TEXT,
  email TEXT,
  phone TEXT,
  title TEXT,
  linkedin TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

-- Activities (interviews, follow-ups, etc.)
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY,
  application_id INTEGER NOT NULL,
  type TEXT,
  date DATETIME,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

-- Tags and join table for many-to-many
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS application_tags (
  application_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (application_id, tag_id),
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_contacts_application_id ON contacts(application_id);
CREATE INDEX IF NOT EXISTS idx_activities_application_id ON activities(application_id);
CREATE INDEX IF NOT EXISTS idx_application_status ON applications(status);

