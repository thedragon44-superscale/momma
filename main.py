# main.py
import os
import shutil
import threading
import time
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List
from fillpdf import fillpdfs
from minio import Minio

import database as db
from dotenv import load_dotenv
load_dotenv()  # Loads variables from .env file

# MinIO Pi Configuration
MINIO_ENDPOINT = "bunchie.thedragonhms.com"
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY")
MINIO_BUCKET = "momma"
MINIO_SECURE = True

LOCAL_VAULT_DIR = "vault_storage"
os.makedirs(LOCAL_VAULT_DIR, exist_ok=True)

from passlib.context import CryptContext
from jose import jwt, JWTError
from cryptography.fernet import Fernet
import smtplib
from email.message import EmailMessage
import random

# --- SECURITY & ENCRYPTION CONFIG ---
SECRET_KEY = os.getenv("SECRET_KEY", "fallback_secret_key_if_missing")
ALGORITHM = "HS256"

# Load Fernet key from .env and encode it back to bytes
raw_fernet = os.getenv("FERNET_KEY")
if raw_fernet:
    cipher_suite = Fernet(raw_fernet.encode('utf-8'))
else:
    cipher_suite = None
    print("Warning: FERNET_KEY not found in .env")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- SMTP CONFIG (thedragonhms.com) ---
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.thedragonhms.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 465))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")

# Pydantic Auth Models
class LoginRequest(BaseModel):
    username: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    pin: str
    new_password: str

# Initialize MinIO Client
try:
    minio_client = Minio(
        MINIO_ENDPOINT,
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=MINIO_SECURE
    )
except Exception as e:
    minio_client = None
    print(f"MinIO initialization warning: {e}")

# Background worker for offline-to-online MinIO synchronization
def auto_sync_worker():
    while True:
        time.sleep(20)  # Check every 20 seconds
        if minio_client:
            try:
                if not minio_client.bucket_exists(MINIO_BUCKET):
                    minio_client.make_bucket(MINIO_BUCKET)
                
                unsynced = db.get_unsynced_documents_db()
                for doc in unsynced:
                    local_file_path = os.path.join(LOCAL_VAULT_DIR, doc["object_name"])
                    if os.path.exists(local_file_path):
                        minio_client.fput_object(MINIO_BUCKET, doc["object_name"], local_file_path)
                        db.mark_document_synced_db(doc["id"])
                        print(f"Successfully synced {doc['file_name']} to MinIO bucket '{MINIO_BUCKET}'")
            except Exception as err:
                # Silently retry on next iteration if offline
                pass

sync_thread = threading.Thread(target=auto_sync_worker, daemon=True)
sync_thread.start()

# Initialize SQLite database on startup
db.init_db()

app = FastAPI(title="Mom's Healthcare Assistant Backend")

# Enable CORS for Electron / React Vite (running on localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows requests from Vite/Electron dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- PYDANTIC SCHEMAS ---
class MasterProfile(BaseModel):
    first_name: str
    middle_name: Optional[str] = ""
    last_name: str
    dob: str  # YYYY-MM-DD
    gender: Optional[str] = ""
    ssn_last4: Optional[str] = ""
    phone: str
    email: Optional[str] = ""
    address: str
    city: Optional[str] = ""
    state: Optional[str] = ""
    zip_code: Optional[str] = ""
    medicare_id: Optional[str] = ""
    insurance_provider: Optional[str] = ""
    insurance_policy_num: Optional[str] = ""
    insurance_group_num: Optional[str] = ""
    secondary_insurance: Optional[str] = ""
    secondary_policy_num: Optional[str] = ""
    primary_doctor: Optional[str] = ""
    primary_doctor_phone: Optional[str] = ""
    allergies: Optional[str] = ""
    emergency_contact_name: Optional[str] = ""
    emergency_contact_relationship: Optional[str] = ""
    emergency_contact_phone: Optional[str] = ""

class Medication(BaseModel):
    name: str
    dosage: str
    frequency: str
    prescribing_doctor: Optional[str] = ""
    instructions: Optional[str] = ""

class LogItem(BaseModel):
    date: str
    category: str
    subject: str
    person_spoken_to: Optional[str] = ""
    ref_number: Optional[str] = ""
    notes: Optional[str] = ""
    follow_up_date: Optional[str] = ""
    resolved: Optional[bool] = False

class Appointment(BaseModel):
    title: str
    doctor_name: Optional[str] = ""
    location: Optional[str] = ""
    appointment_date: str  # YYYY-MM-DD
    appointment_time: Optional[str] = ""
    notes: Optional[str] = ""
    completed: Optional[bool] = False

class Credential(BaseModel):
    service_name: str
    username: str
    password: str
    url: Optional[str] = ""
    notes: Optional[str] = ""


# --- ENDPOINTS ---

@app.get("/")
def root():
    return {"status": "ok", "message": "Mom's Health Assistant API is running"}


# --- AUTHENTICATION & RECOVERY ENDPOINTS ---
@app.post("/api/auth/register")
def register(req: LoginRequest, email: str):
    if db.get_user_by_username(req.username):
        raise HTTPException(status_code=400, detail="Username taken")
    hashed = pwd_context.hash(req.password)
    db.create_user(req.username, email, hashed)
    return {"message": "Master account created"}

@app.post("/api/auth/login")
def login(req: LoginRequest):
    user = db.get_user_by_username(req.username)
    if not user or not pwd_context.verify(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = jwt.encode({"sub": user["username"]}, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": token, "token_type": "bearer"}

@app.post("/api/auth/forgot-password")
def forgot_password(req: ForgotPasswordRequest):
    user = db.get_user_by_email(req.email)
    if not user:
        return {"message": "If that email exists, a PIN was sent."} # Prevent email enumeration
    
    pin = str(random.randint(100000, 999999))
    expires = time.time() + 900 # 15 minutes
    db.update_user_pin(req.email, pin, expires)
    
    # Send Email
    msg = EmailMessage()
    msg.set_content(f"Your password reset PIN is: {pin}\nThis PIN expires in 15 minutes.")
    msg['Subject'] = 'Mom Health App - Password Reset'
    msg['From'] = SMTP_USER
    msg['To'] = req.email
    
    try:
        # Use smtplib.SMTP(SMTP_SERVER, 587) and server.starttls() if using port 587
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
    except Exception as e:
        print(f"Failed to send email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send recovery email")

    return {"message": "Recovery PIN sent to email"}

@app.post("/api/auth/reset-password")
def reset_password(req: ResetPasswordRequest):
    user = db.get_user_by_email(req.email)
    if not user or user["reset_pin"] != req.pin or time.time() > user["pin_expires"]:
        raise HTTPException(status_code=400, detail="Invalid or expired PIN")
    
    hashed = pwd_context.hash(req.new_password)
    db.update_user_password(req.email, hashed)
    return {"message": "Password updated successfully"}

# 1. PROFILE ENDPOINTS
@app.get("/api/profile")
def get_profile():
    return db.get_profile_db()

@app.post("/api/profile")
def save_profile(profile: MasterProfile):
    db.save_profile_db(profile.model_dump())
    return {"message": "Profile saved successfully!"}


# 2. MEDICATION ENDPOINTS
@app.get("/api/medications")
def get_medications():
    return db.get_medications_db()

@app.post("/api/medications")
def add_medication(med: Medication):
    med_id = db.add_medication_db(med.model_dump())
    return {"message": "Medication added", "id": med_id}

@app.delete("/api/medications/{med_id}")
def delete_medication(med_id: int):
    db.delete_medication_db(med_id)
    return {"message": f"Medication {med_id} deleted"}


# 3. BATTLE LOG ENDPOINTS
@app.get("/api/logs")
def get_logs():
    return db.get_logs_db()

@app.post("/api/logs")
def add_log(log_item: LogItem):
    log_id = db.add_log_db(log_item.model_dump())
    return {"message": "Log item created", "id": log_id}

@app.put("/api/logs/{log_id}/toggle")
def toggle_log_status(log_id: int, resolved: bool):
    db.toggle_log_status_db(log_id, resolved)
    return {"message": "Status updated"}

@app.get("/api/logs")
def get_logs():
    return db.get_logs_db()

@app.post("/api/logs")
def add_log(log: LogItem):
    log_id = db.add_log_db(log.model_dump())
    return {"message": "Log added", "id": log_id}

@app.delete("/api/logs/{log_id}")
def delete_log(log_id: int):
    db.delete_log_db(log_id)
    return {"message": f"Log {log_id} deleted"}


# 3.5 APPOINTMENT ENDPOINTS
@app.get("/api/appointments")
def get_appointments():
    return db.get_appointments_db()

@app.post("/api/appointments")
def add_appointment(appt: Appointment):
    appt_id = db.add_appointment_db(appt.model_dump())
    return {"message": "Appointment added", "id": appt_id}

@app.delete("/api/appointments/{appt_id}")
def delete_appointment(appt_id: int):
    db.delete_appointment_db(appt_id)
    return {"message": f"Appointment {appt_id} deleted"}

@app.put("/api/appointments/{appt_id}/toggle")
def toggle_appointment_status(appt_id: int, completed: bool):
    db.toggle_appointment_status_db(appt_id, completed)
    return {"message": "Appointment status updated"}


# 3.6 CREDENTIAL ENDPOINTS
@app.get("/api/credentials")
def get_credentials():
    creds = db.get_credentials_db()
    for c in creds:
        try:
            # Decrypt password before sending to frontend
            c["password"] = cipher_suite.decrypt(c["password"].encode()).decode()
        except Exception:
            c["password"] = "Error: Could not decrypt"
    return creds

@app.post("/api/credentials")
def add_credential(cred: Credential):
    # Encrypt password before saving
    encrypted_pw = cipher_suite.encrypt(cred.password.encode()).decode()
    cred_dump = cred.model_dump()
    cred_dump["password"] = encrypted_pw
    
    cred_id = db.add_credential_db(cred_dump)
    return {"message": "Credential added", "id": cred_id}

@app.delete("/api/credentials/{cred_id}")
def delete_credential(cred_id: int):
    db.delete_credential_db(cred_id)
    return {"message": f"Credential {cred_id} deleted"}

# 3.7 DOCUMENT VAULT & MINIO ENDPOINTS
@app.get("/api/documents")
def get_documents():
    return db.get_documents_db()

@app.post("/api/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    category: str = Form("General Record"),
    notes: str = Form("")
):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    object_name = f"{timestamp}_{file.filename}"
    local_path = os.path.join(LOCAL_VAULT_DIR, object_name)

    # 1. Save locally to ensure offline availability
    with open(local_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 2. Try direct MinIO upload
    synced = 0
    if minio_client:
        try:
            if not minio_client.bucket_exists(MINIO_BUCKET):
                minio_client.make_bucket(MINIO_BUCKET)
            minio_client.fput_object(MINIO_BUCKET, object_name, local_path)
            synced = 1
        except Exception as e:
            print(f"MinIO direct upload failed, queued for background sync: {e}")

    # 3. Log metadata in DB
    doc_id = db.add_document_db({
        "file_name": file.filename,
        "object_name": object_name,
        "category": category,
        "upload_date": datetime.now().strftime("%Y-%m-%d"),
        "notes": notes,
        "synced": synced
    })

    return {"message": "Document uploaded successfully", "id": doc_id, "synced": bool(synced)}

@app.get("/api/documents/{doc_id}/download")
def download_document(doc_id: int):
    docs = db.get_documents_db()
    matching = [d for d in docs if d["id"] == doc_id]
    if not matching:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc = matching[0]
    local_path = os.path.join(LOCAL_VAULT_DIR, doc["object_name"])

    # Fallback to fetching from MinIO if missing locally
    if not os.path.exists(local_path) and minio_client:
        try:
            minio_client.fget_object(MINIO_BUCKET, doc["object_name"], local_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to fetch document from remote vault: {str(e)}")

    if os.path.exists(local_path):
        return FileResponse(local_path, filename=doc["file_name"])
    
    raise HTTPException(status_code=404, detail="File unavailable locally and remotely.")


# 4. PDF FORM AUTO-FILLER ENDPOINTS
TEMP_DIR = "temp_pdfs"
os.makedirs(TEMP_DIR, exist_ok=True)

@app.post("/api/pdf/inspect")
async def inspect_pdf_fields(file: UploadFile = File(...)):
    """Uploads a PDF and returns all detected fillable form field names."""
    file_path = os.path.join(TEMP_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        fields = fillpdfs.get_form_fields(file_path)
        return {"filename": file.filename, "fields": fields}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse PDF fields: {str(e)}")

@app.post("/api/pdf/autofill")
async def autofill_pdf(file: UploadFile = File(...)):
    """
    Takes an uploaded PDF, fetches Mom's profile from DB, 
    attempts to fuzzy-match profile keys to form fields, fills it out, and returns the PDF.
    """
    input_path = os.path.join(TEMP_DIR, file.filename)
    output_path = os.path.join(TEMP_DIR, f"FILLED_{file.filename}")
    
    with open(input_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    profile_data = db.get_profile_db()
    if not profile_data:
        raise HTTPException(status_code=400, detail="Master profile is empty. Please save a profile first.")
        
    # Get form fields in the PDF
    fields = fillpdfs.get_form_fields(input_path)
    
    # Comprehensive smart mapping rule set (maps DB profile keys to PDF field names)
    field_dict = {}
    for pdf_field in fields.keys():
        pdf_field_lower = pdf_field.lower()
        
        if "first" in pdf_field_lower and "name" in pdf_field_lower:
            field_dict[pdf_field] = profile_data.get("first_name", "")
        elif "middle" in pdf_field_lower:
            field_dict[pdf_field] = profile_data.get("middle_name", "")
        elif "last" in pdf_field_lower and "name" in pdf_field_lower:
            field_dict[pdf_field] = profile_data.get("last_name", "")
        elif "dob" in pdf_field_lower or "birth" in pdf_field_lower:
            field_dict[pdf_field] = profile_data.get("dob", "")
        elif "sex" in pdf_field_lower or "gender" in pdf_field_lower:
            field_dict[pdf_field] = profile_data.get("gender", "")
        elif "ssn" in pdf_field_lower or "social" in pdf_field_lower:
            field_dict[pdf_field] = profile_data.get("ssn_last4", "")
        elif "phone" in pdf_field_lower or "telephone" in pdf_field_lower:
            field_dict[pdf_field] = profile_data.get("phone", "")
        elif "email" in pdf_field_lower:
            field_dict[pdf_field] = profile_data.get("email", "")
        elif "city" in pdf_field_lower:
            field_dict[pdf_field] = profile_data.get("city", "")
        elif "state" in pdf_field_lower:
            field_dict[pdf_field] = profile_data.get("state", "")
        elif "zip" in pdf_field_lower or "postal" in pdf_field_lower:
            field_dict[pdf_field] = profile_data.get("zip_code", "")
        elif "street" in pdf_field_lower or "address" in pdf_field_lower:
            field_dict[pdf_field] = profile_data.get("address", "")
        elif "medicare" in pdf_field_lower:
            field_dict[pdf_field] = profile_data.get("medicare_id", "")
        elif "group" in pdf_field_lower:
            field_dict[pdf_field] = profile_data.get("insurance_group_num", "")
        elif "secondary" in pdf_field_lower:
            field_dict[pdf_field] = profile_data.get("secondary_insurance", "")
        elif "policy" in pdf_field_lower or "insurance" in pdf_field_lower:
            field_dict[pdf_field] = profile_data.get("insurance_policy_num", "")
        elif "doctor" in pdf_field_lower or "physician" in pdf_field_lower:
            field_dict[pdf_field] = profile_data.get("primary_doctor", "")
        elif "allergy" in pdf_field_lower or "allergies" in pdf_field_lower:
            field_dict[pdf_field] = profile_data.get("allergies", "")
        elif "emergency" in pdf_field_lower:
            field_dict[pdf_field] = profile_data.get("emergency_contact_name", "")

    # Fill and flatten PDF
    fillpdfs.write_fillable_form(input_path, output_path, field_dict)
    
    return FileResponse(
        output_path, 
        media_type="application/pdf", 
        filename=f"FILLED_{file.filename}"
    )
