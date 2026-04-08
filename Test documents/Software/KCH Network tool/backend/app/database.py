import sqlite3
from pathlib import Path
from contextlib import contextmanager

from app.config import settings

# Extract path from sqlite URL
_db_path = settings.database_url.replace("sqlite:///", "")
Path(_db_path).parent.mkdir(parents=True, exist_ok=True)


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(_db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def get_db():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    """Create all tables if they don't exist."""
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'member',
                hospital_site TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT (datetime('now')),
                last_login TEXT
            );

            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                original_filename TEXT NOT NULL,
                title TEXT NOT NULL,
                document_type TEXT,
                department TEXT,
                hospital_site TEXT,
                version TEXT DEFAULT '1.0',
                tags TEXT,
                uploaded_by TEXT REFERENCES users(id),
                file_size INTEGER,
                page_count INTEGER,
                chunk_count INTEGER,
                status TEXT DEFAULT 'processing',
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT
            );

            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                user_id TEXT REFERENCES users(id),
                title TEXT,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT
            );

            CREATE TABLE IF NOT EXISTS query_log (
                id TEXT PRIMARY KEY,
                user_id TEXT REFERENCES users(id),
                query_text TEXT NOT NULL,
                response_text TEXT,
                confidence_score REAL,
                source_document_ids TEXT,
                response_time_ms INTEGER,
                conversation_id TEXT REFERENCES conversations(id),
                created_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS access_log (
                id TEXT PRIMARY KEY,
                user_id TEXT REFERENCES users(id),
                document_id TEXT REFERENCES documents(id),
                action TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
            CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
            CREATE INDEX IF NOT EXISTS idx_query_log_user ON query_log(user_id);
            CREATE INDEX IF NOT EXISTS idx_query_log_conversation ON query_log(conversation_id);
            CREATE INDEX IF NOT EXISTS idx_access_log_user ON access_log(user_id);
            CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
        """)
