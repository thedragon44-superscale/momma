# database.py
import sqlite3
import json

DB_NAME = "mom_health.db"

def get_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes the database schema if tables don't exist."""
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # 1. Master Profile Table (Stored as key-value JSON or single row)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS profile (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                data TEXT NOT NULL
            )
        ''')
        
        # 2. Medications Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS medications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                dosage TEXT NOT NULL,
                frequency TEXT NOT NULL,
                prescribing_doctor TEXT,
                instructions TEXT
            )
        ''')
        
        # 3. Insurance & Accommodations "Battle Log"
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS battle_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                category TEXT NOT NULL,
                subject TEXT NOT NULL,
                person_spoken_to TEXT,
                ref_number TEXT,
                notes TEXT,
                follow_up_date TEXT,
                resolved INTEGER DEFAULT 0
            )
        ''')

        # 4. Appointments Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS appointments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                doctor_name TEXT,
                location TEXT,
                appointment_date TEXT NOT NULL,
                appointment_time TEXT,
                notes TEXT,
                completed INTEGER DEFAULT 0
            )
        ''')

        # 5. Sensitive Credentials Vault Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS credentials (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                service_name TEXT NOT NULL, -- e.g., 'MyChart Portal', 'Medicare Account'
                username TEXT NOT NULL,
                password TEXT NOT NULL,
                url TEXT,
                notes TEXT
            )
        ''')

        # 6. MinIO Document Metadata Table with Sync Tracking
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_name TEXT NOT NULL,
                object_name TEXT NOT NULL,
                category TEXT NOT NULL,
                upload_date TEXT NOT NULL,
                notes TEXT,
                synced INTEGER DEFAULT 0
            )
        ''')
        conn.commit()

# 7. Users Table (Master Auth)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                reset_pin TEXT,
                pin_expires REAL
            )
        ''')

# --- PROFILE HELPERS ---
def save_profile_db(profile_dict: dict):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO profile (id, data) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
            (json.dumps(profile_dict),)
        )
        conn.commit()

def get_profile_db() -> dict:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT data FROM profile WHERE id = 1")
        row = cursor.fetchone()
        if row:
            return json.loads(row["data"])
        return {}

# --- MEDICATION HELPERS ---
def add_medication_db(med: dict) -> int:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO medications (name, dosage, frequency, prescribing_doctor, instructions)
            VALUES (:name, :dosage, :frequency, :prescribing_doctor, :instructions)
        ''', med)
        conn.commit()
        return cursor.lastrowid

def get_medications_db() -> list:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM medications")
        return [dict(row) for row in cursor.fetchall()]

def delete_medication_db(med_id: int):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM medications WHERE id = ?", (med_id,))
        conn.commit()

# --- BATTLE LOG HELPERS ---
def add_log_db(log_item: dict) -> int:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO battle_log (date, category, subject, person_spoken_to, ref_number, notes, follow_up_date, resolved)
            VALUES (:date, :category, :subject, :person_spoken_to, :ref_number, :notes, :follow_up_date, :resolved)
        ''', log_item)
        conn.commit()
        return cursor.lastrowid

def get_logs_db() -> list:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM battle_log ORDER BY id DESC")
        return [dict(row) for row in cursor.fetchall()]

def toggle_log_status_db(log_id: int, resolved: bool):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE battle_log SET resolved = ? WHERE id = ?", (1 if resolved else 0, log_id))
        conn.commit()

# --- APPOINTMENT HELPERS ---
def add_appointment_db(appt: dict) -> int:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO appointments (title, doctor_name, location, appointment_date, appointment_time, notes, completed)
            VALUES (:title, :doctor_name, :location, :appointment_date, :appointment_time, :notes, :completed)
        ''', appt)
        conn.commit()
        return cursor.lastrowid

def get_appointments_db() -> list:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM appointments ORDER BY appointment_date ASC")
        return [dict(row) for row in cursor.fetchall()]

def delete_appointment_db(appt_id: int):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM appointments WHERE id = ?", (appt_id,))
        conn.commit()

# --- CREDENTIALS HELPERS ---
def add_credential_db(cred: dict) -> int:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO credentials (service_name, username, password, url, notes)
            VALUES (:service_name, :username, :password, :url, :notes)
        ''', cred)
        conn.commit()
        return cursor.lastrowid

def get_credentials_db() -> list:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM credentials")
        return [dict(row) for row in cursor.fetchall()]

def delete_credential_db(cred_id: int):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM credentials WHERE id = ?", (cred_id,))
        conn.commit()

# --- DOCUMENT METADATA HELPERS ---
def add_document_db(doc: dict) -> int:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO documents (file_name, object_name, category, upload_date, notes)
            VALUES (:file_name, :object_name, :category, :upload_date, :notes)
        ''', doc)
        conn.commit()
        return cursor.lastrowid

def get_documents_db() -> list:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM documents ORDER BY id DESC")
        return [dict(row) for row in cursor.fetchall()]

def toggle_appointment_status_db(appt_id: int, completed: bool):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE appointments SET completed = ? WHERE id = ?", (1 if completed else 0, appt_id))
        conn.commit()

# --- DOCUMENT & MINIO SYNC HELPERS ---
def add_document_db(doc: dict) -> int:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO documents (file_name, object_name, category, upload_date, notes, synced)
            VALUES (:file_name, :object_name, :category, :upload_date, :notes, :synced)
        ''', doc)
        conn.commit()
        return cursor.lastrowid

def get_documents_db() -> list:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM documents ORDER BY id DESC")
        return [dict(row) for row in cursor.fetchall()]

def get_unsynced_documents_db() -> list:
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM documents WHERE synced = 0")
        return [dict(row) for row in cursor.fetchall()]

def mark_document_synced_db(doc_id: int):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE documents SET synced = 1 WHERE id = ?", (doc_id,))
        conn.commit()

# --- AUTHENTICATION HELPERS ---
def get_user_by_username(username: str):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
        row = cursor.fetchone()
        return dict(row) if row else None

def get_user_by_email(email: str):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
        row = cursor.fetchone()
        return dict(row) if row else None

def create_user(username: str, email: str, password_hash: str):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)", 
                       (username, email, password_hash))
        conn.commit()

def update_user_pin(email: str, pin: str, expires: float):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET reset_pin = ?, pin_expires = ? WHERE email = ?", 
                       (pin, expires, email))
        conn.commit()

def update_user_password(email: str, new_hash: str):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET password_hash = ?, reset_pin = NULL, pin_expires = NULL WHERE email = ?", 
                       (new_hash, email))
        conn.commit()
