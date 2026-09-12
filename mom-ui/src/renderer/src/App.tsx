import { useState, useEffect } from 'react'

function App() {
  const API_BASE = 'https://api-mom.thedragonhms.com'
  
  // Auth State
  const [token, setToken] = useState(localStorage.getItem('mom_token') || '')
  const [authMode, setAuthMode] = useState('login') // 'login', 'register', 'forgot', 'reset'
  const [authData, setAuthData] = useState({ username: '', password: '', email: '', pin: '', new_password: '' })
  const [authMessage, setAuthMessage] = useState('')

  const [status, setStatus] = useState('🟡 Waiting for Python backend...')
  const [activeTab, setActiveTab] = useState<'profile' | 'meds' | 'appts' | 'creds' | 'vault' | 'logs'>('profile')
  const [profile, setProfile] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '', middle_name: '', last_name: '', dob: '', gender: '', ssn_last4: '',
    phone: '', email: '', address: '', city: '', state: '', zip_code: '',
    medicare_id: '', insurance_provider: '', insurance_policy_num: '', insurance_group_num: '',
    secondary_insurance: '', secondary_policy_num: '',
    primary_doctor: '', primary_doctor_phone: '', allergies: '',
    emergency_contact_name: '', emergency_contact_relationship: '', emergency_contact_phone: ''
  })

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  })

  // Medication tab state
  const [medications, setMedications] = useState<any[]>([])
  const [isAddingMed, setIsAddingMed] = useState(false)
  const [medFormData, setMedFormData] = useState({
    name: '', dosage: '', frequency: '', prescribing_doctor: '', instructions: ''
  })

  const fetchMedications = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/medications`, { headers: getAuthHeaders() })
      if (res.ok) setMedications(await res.json())
    } catch (err) { console.error('Failed to fetch medications', err) }
  }

  // Appointments tab state
  const todayStr = new Date().toISOString().split('T')[0]
  const [appointments, setAppointments] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(todayStr)
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date())
  const [isAddingAppt, setIsAddingAppt] = useState(false)
  const [apptFormData, setApptFormData] = useState({
    title: '', doctor_name: '', location: '', appointment_time: '09:00', notes: ''
  })

  const fetchAppointments = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/appointments`, { headers: getAuthHeaders() })
      if (res.ok) setAppointments(await res.json())
    } catch (err) { console.error('Failed to fetch appointments', err) }
  }

  // Credentials tab state
  const [credentials, setCredentials] = useState<any[]>([])
  const [isAddingCred, setIsAddingCred] = useState(false)
  const [credFormData, setCredFormData] = useState({
    service_name: '', username: '', password: '', url: '', notes: ''
  })
  const [showPasswords, setShowPasswords] = useState<{ [key: number]: boolean }>({})

  const fetchCredentials = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/credentials`, { headers: getAuthHeaders() })
      if (res.ok) setCredentials(await res.json())
    } catch (err) { console.error('Failed to fetch credentials', err) }
  }

  // Document Vault & PDF Autofill tab state
  const [documents, setDocuments] = useState<any[]>([])
  const [docCategory, setDocCategory] = useState('General Record')
  const [docNotes, setDocNotes] = useState('')
  const [selectedDocFile, setSelectedDocFile] = useState<File | null>(null)
  const [isUploadingDoc, setIsUploadingDoc] = useState(false)

  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [isAutofillLoading, setIsAutofillLoading] = useState(false)

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/documents`, { headers: getAuthHeaders() })
      if (res.ok) setDocuments(await res.json())
    } catch (err) { console.error('Failed to fetch documents', err) }
  }

  // Call & Insurance Log tab state
  const [logs, setLogs] = useState<any[]>([])
  const [isAddingLog, setIsAddingLog] = useState(false)
  const [logFormData, setLogFormData] = useState({
    date: new Date().toISOString().split('T')[0], category: 'Insurance', subject: '',
    person_spoken_to: '', ref_number: '', notes: '', follow_up_date: ''
  })

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/logs`, { headers: getAuthHeaders() })
      if (res.ok) setLogs(await res.json())
    } catch (err) { console.error('Failed to fetch logs', err) }
  }

  const handleAuthChange = (e: any) => {
    setAuthData({ ...authData, [e.target.name]: e.target.value })
  }

  const handleLogin = async (e: any) => {
    e.preventDefault()
    setAuthMessage('Logging in...')
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authData.username, password: authData.password })
      })
      if (res.ok) {
        const data = await res.json()
        setToken(data.access_token)
        localStorage.setItem('mom_token', data.access_token)
        setAuthMessage('')
      } else {
        setAuthMessage('Invalid username or password.')
      }
    } catch (err) {
      setAuthMessage('Could not connect to server.')
    }
  }

  const handleLogout = () => {
    setToken('')
    localStorage.removeItem('mom_token')
    setProfile(null)
  }

  const handleForgotPassword = async (e: any) => {
    e.preventDefault()
    setAuthMessage('Sending PIN...')
    const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: authData.email })
    })
    if (res.ok) {
      setAuthMode('reset')
      setAuthMessage('PIN sent to your email!')
    }
  }

  const handleResetPassword = async (e: any) => {
    e.preventDefault()
    const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: authData.email, pin: authData.pin, new_password: authData.new_password })
    })
    if (res.ok) {
      setAuthMode('login')
      setAuthMessage('Password reset successfully! Please log in.')
    } else {
      setAuthMessage('Invalid PIN or PIN expired.')
    }
  }

  // 1. Check connection and load initial data
  useEffect(() => {
    if (!token) return; // Wait until logged in

    const loadData = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/profile`, {
          headers: getAuthHeaders()
        })
        if (res.ok) {
          const data = await res.json()
          setStatus('🟢 Connected to Cloud Vault')
          if (Object.keys(data).length > 0) {
            setProfile(data)
            setFormData(data)
          } else {
            setIsEditing(true)
          }
          fetchMedications()
          fetchAppointments()
          fetchCredentials()
          fetchDocuments()
          fetchLogs()
        } else {
          setStatus('🔴 Session Expired')
          handleLogout()
        }
      } catch (err) {
        setStatus('🔴 Connection Error')
      }
    }
    
    loadData()
  }, [token])

  const handleLogChange = (e: any) => {
    setLogFormData({ ...logFormData, [e.target.name]: e.target.value })
  }

  const handleSaveLog = async (e: any) => {
    e.preventDefault()
    try {
      const res = await fetch(`${API_BASE}/api/logs`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(logFormData)
      })
      if (res.ok) {
        setLogFormData({ date: new Date().toISOString().split('T')[0], category: 'Insurance', subject: '', person_spoken_to: '', ref_number: '', notes: '', follow_up_date: '' })
        setIsAddingLog(false)
        fetchLogs()
      }
    } catch (error) { alert('Error saving log entry.') }
  }

  const handleDeleteLog = async (logId: number) => {
    if (window.confirm('Are you sure you want to delete this call record?')) {
      try {
        const res = await fetch(`${API_BASE}/api/logs/${logId}`, { 
          method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } 
        })
        if (res.ok) fetchLogs()
      } catch (error) { alert('Error deleting log.') }
    }
  }

  const handleToggleLog = async (logId: number, currentStatus: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/api/logs/${logId}/toggle?resolved=${!currentStatus}`, { 
        method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } 
      })
      if (res.ok) fetchLogs()
    } catch (error) { alert('Error updating resolution status.') }
  }

  const handleUploadDocument = async (e: any) => {
    e.preventDefault()
    if (!selectedDocFile) { alert('Please select a file to upload.'); return }

    const formDataPayload = new FormData()
    formDataPayload.append('file', selectedDocFile)
    formDataPayload.append('category', docCategory)
    formDataPayload.append('notes', docNotes)

    setIsUploadingDoc(true)
    try {
      const res = await fetch(`${API_BASE}/api/documents/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }, // No Content-Type for FormData
        body: formDataPayload
      })
      if (res.ok) {
        setSelectedDocFile(null)
        setDocNotes('')
        fetchDocuments()
        alert('Document stored successfully!')
      } else { alert('Failed to upload document.') }
    } catch (err) { alert('Error uploading document.') } 
    finally { setIsUploadingDoc(false) }
  }

  const handleAutofillPdf = async (e: any) => {
    e.preventDefault()
    if (!pdfFile) { alert('Please select a blank PDF form.'); return }

    const formDataPayload = new FormData()
    formDataPayload.append('file', pdfFile)

    setIsAutofillLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/pdf/autofill`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataPayload
      })

      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `FILLED_${pdfFile.name}`
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
        alert('PDF auto-filled successfully!')
      } else {
        const errData = await res.json()
        alert(`Auto-fill error: ${errData.detail || 'Could not parse form'}`)
      }
    } catch (err) { alert('Error auto-filling PDF form.') } 
    finally { setIsAutofillLoading(false) }
  }

  const handleCredChange = (e: any) => {
    setCredFormData({ ...credFormData, [e.target.name]: e.target.value })
  }

  const handleSaveCred = async (e: any) => {
    e.preventDefault()
    try {
      const res = await fetch(`${API_BASE}/api/credentials`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(credFormData)
      })
      if (res.ok) {
        setCredFormData({ service_name: '', username: '', password: '', url: '', notes: '' })
        setIsAddingCred(false)
        fetchCredentials()
      }
    } catch (error) { alert('Error saving login details.') }
  }

  const handleDeleteCred = async (credId: number) => {
    if (window.confirm('Are you sure you want to delete this login entry?')) {
      try {
        const res = await fetch(`${API_BASE}/api/credentials/${credId}`, { 
          method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } 
        })
        if (res.ok) fetchCredentials()
      } catch (error) { alert('Error deleting login entry.') }
    }
  }

  const togglePasswordVisibility = (credId: number) => {
    setShowPasswords(prev => ({ ...prev, [credId]: !prev[credId] }))
  }

  const handleApptChange = (e: any) => {
    setApptFormData({ ...apptFormData, [e.target.name]: e.target.value })
  }

  const handleSaveAppt = async (e: any) => {
    e.preventDefault()
    try {
      const payload = { ...apptFormData, appointment_date: selectedDate, completed: false }
      const res = await fetch(`${API_BASE}/api/appointments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        setApptFormData({ title: '', doctor_name: '', location: '', appointment_time: '09:00', notes: '' })
        setIsAddingAppt(false)
        fetchAppointments()
      }
    } catch (error) { alert('Error saving appointment.') }
  }

  const handleDeleteAppt = async (apptId: number) => {
    if (window.confirm('Are you sure you want to delete this appointment?')) {
      try {
        const res = await fetch(`${API_BASE}/api/appointments/${apptId}`, { 
          method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } 
        })
        if (res.ok) fetchAppointments()
      } catch (error) { alert('Error deleting appointment.') }
    }
  }

  const handleToggleAppt = async (apptId: number, currentStatus: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/api/appointments/${apptId}/toggle?completed=${!currentStatus}`, {
        method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } 
      })
      if (res.ok) fetchAppointments()
    } catch (error) { alert('Error updating appointment status.') }
  }

  const handleMedChange = (e: any) => {
    setMedFormData({ ...medFormData, [e.target.name]: e.target.value })
  }

  const handleSaveMed = async (e: any) => {
    e.preventDefault()
    try {
      const res = await fetch(`${API_BASE}/api/medications`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(medFormData)
      })
      if (res.ok) {
        setMedFormData({ name: '', dosage: '', frequency: '', prescribing_doctor: '', instructions: '' })
        setIsAddingMed(false)
        fetchMedications()
      }
    } catch (error) { alert('Error saving medication.') }
  }

  const handleDeleteMed = async (medId: number) => {
    if (window.confirm('Are you sure you want to delete this medication?')) {
      try {
        const res = await fetch(`${API_BASE}/api/medications/${medId}`, { 
          method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } 
        })
        if (res.ok) fetchMedications()
      } catch (error) { alert('Error deleting medication.') }
    }
  }

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSave = async (e: any) => {
    e.preventDefault()
    try {
      const res = await fetch(`${API_BASE}/api/profile`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        setProfile(formData as any)
        setIsEditing(false)
        alert('Profile Saved Successfully!')
      }
    } catch (error) { alert('Error saving profile.') }
  }

  // --- SENIOR-FRIENDLY DESIGN SYSTEM STYLES ---
  const cardStyle = {
    backgroundColor: '#ffffff',
    padding: '24px',
    borderRadius: '12px',
    border: '2px solid #CBD5E1',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    marginBottom: '24px'
  }
  const sectionHeaderStyle = {
    fontSize: '22px',
    fontWeight: 'bold' as const,
    color: '#0F172A',
    marginBottom: '16px',
    borderBottom: '2px solid #E2E8F0',
    paddingBottom: '8px'
  }
  const inputStyle = {
    width: '100%', padding: '12px', margin: '6px 0 16px 0', 
    fontSize: '18px', border: '2px solid #64748B', borderRadius: '6px',
    backgroundColor: '#F8FAFC', color: '#0F172A', boxSizing: 'border-box' as const
  }
  const labelStyle = { fontSize: '18px', fontWeight: 'bold' as const, color: '#334155' }

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f4f4f4', height: '100vh', overflowY: 'auto', boxSizing: 'border-box', color: '#111' }}>
      
      {/* AUTHENTICATION SCREEN */}
      {!token && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw', position: 'fixed', top: 0, left: 0, backgroundColor: '#F8FAFC' }}>
          <div style={{ ...cardStyle, width: '400px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '28px', marginBottom: '8px', color: '#0F172A' }}>Mom's Health Vault</h2>
            <p style={{ color: '#64748B', marginBottom: '24px' }}>Secure Cloud Access</p>
            
            {authMessage && <div style={{ padding: '10px', backgroundColor: '#DBEAFE', color: '#1E40AF', marginBottom: '16px', borderRadius: '6px' }}>{authMessage}</div>}

            {authMode === 'login' && (
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <input style={inputStyle} name="username" placeholder="Username" onChange={handleAuthChange} required />
                <input style={inputStyle} name="password" type="password" placeholder="Password" onChange={handleAuthChange} required />
                <button type="submit" style={{ padding: '12px', fontSize: '18px', backgroundColor: '#2563EB', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Log In</button>
                <button type="button" onClick={() => setAuthMode('forgot')} style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', marginTop: '8px' }}>Forgot Password?</button>
                <button type="button" onClick={() => setAuthMode('register')} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>First time? Register Master Account</button>
              </form>
            )}

            {authMode === 'forgot' && (
              <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <input style={inputStyle} name="email" type="email" placeholder="Account Email" onChange={handleAuthChange} required />
                <button type="submit" style={{ padding: '12px', fontSize: '18px', backgroundColor: '#2563EB', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Send Reset PIN</button>
                <button type="button" onClick={() => setAuthMode('login')} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', marginTop: '8px' }}>Back to Login</button>
              </form>
            )}

            {authMode === 'reset' && (
              <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <input style={inputStyle} name="email" type="email" placeholder="Account Email" onChange={handleAuthChange} required />
                <input style={inputStyle} name="pin" placeholder="6-Digit PIN from Email" onChange={handleAuthChange} required />
                <input style={inputStyle} name="new_password" type="password" placeholder="New Password" onChange={handleAuthChange} required />
                <button type="submit" style={{ padding: '12px', fontSize: '18px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Reset Password</button>
              </form>
            )}
            
            {authMode === 'register' && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                const res = await fetch(`${API_BASE}/api/auth/register?email=${authData.email}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ username: authData.username, password: authData.password })
                });
                if(res.ok) { setAuthMessage('Registered! Please log in.'); setAuthMode('login'); }
              }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <input style={inputStyle} name="email" type="email" placeholder="Recovery Email" onChange={handleAuthChange} required />
                <input style={inputStyle} name="username" placeholder="Choose Username" onChange={handleAuthChange} required />
                <input style={inputStyle} name="password" type="password" placeholder="Choose Password" onChange={handleAuthChange} required />
                <button type="submit" style={{ padding: '12px', fontSize: '18px', backgroundColor: '#0F172A', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Create Account</button>
                <button type="button" onClick={() => setAuthMode('login')} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', marginTop: '8px' }}>Cancel</button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MAIN APPLICATION (Only visible if logged in) */}
      {token && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '32px', margin: 0 }}>Mom's Health Hub</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{status}</span>
              <button onClick={handleLogout} style={{ padding: '8px 16px', backgroundColor: '#DC2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Logout</button>
            </div>
          </div>
          
          {/* High-Contrast Senior Navigation Bar */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', margin: '20px 0' }}>
        {[
          { id: 'profile', label: '📋 Master Profile' },
          { id: 'meds', label: '💊 Medications' },
          { id: 'appts', label: '📅 Appointments' },
          { id: 'creds', label: '🔑 Passwords & Logins' },
          { id: 'vault', label: '📂 Records & PDF Forms' },
          { id: 'logs', label: '📝 Call & Insurance Log' }
        ].map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                fontSize: '20px',
                fontWeight: 'bold',
                padding: '16px 24px',
                borderRadius: '8px',
                border: isActive ? '3px solid #002b66' : '2px solid #999',
                backgroundColor: isActive ? '#0056b3' : '#e6e6e6',
                color: isActive ? '#ffffff' : '#111111',
                cursor: 'pointer',
                boxShadow: isActive ? '0px 4px 8px rgba(0,0,0,0.2)' : 'none'
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Contents */}
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', border: '2px solid #ccc' }}>
        
        {/* TAB 1: MASTER PROFILE */}
        {activeTab === 'profile' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '32px', margin: 0, color: '#0F172A' }}>Master Health Profile</h2>
              {!isEditing && !status.includes('Waiting') && (
                <button 
                  onClick={() => setIsEditing(true)}
                  style={{ padding: '12px 28px', fontSize: '20px', backgroundColor: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  ✏️ Edit Profile
                </button>
              )}
            </div>

            {status.includes('Waiting') ? (
              <p style={{ fontSize: '20px' }}>Waking up the database... please wait a moment.</p>
            ) : isEditing ? (
              <form onSubmit={handleSave}>
                {/* 1. Personal Details Card */}
                <div style={cardStyle}>
                  <div style={sectionHeaderStyle}>👤 Personal Details</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    <div><label style={labelStyle}>First Name</label><input style={inputStyle} name="first_name" value={formData.first_name} onChange={handleChange} required /></div>
                    <div><label style={labelStyle}>Middle Name</label><input style={inputStyle} name="middle_name" value={formData.middle_name} onChange={handleChange} /></div>
                    <div><label style={labelStyle}>Last Name</label><input style={inputStyle} name="last_name" value={formData.last_name} onChange={handleChange} required /></div>
                    <div><label style={labelStyle}>Date of Birth (YYYY-MM-DD)</label><input style={inputStyle} name="dob" value={formData.dob} onChange={handleChange} required /></div>
                    <div><label style={labelStyle}>Gender / Sex</label><input style={inputStyle} name="gender" value={formData.gender} onChange={handleChange} /></div>
                    <div><label style={labelStyle}>SSN (Last 4 Digits)</label><input style={inputStyle} name="ssn_last4" value={formData.ssn_last4} onChange={handleChange} maxLength={4} /></div>
                    <div><label style={labelStyle}>Phone Number</label><input style={inputStyle} name="phone" value={formData.phone} onChange={handleChange} required /></div>
                    <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>Email Address</label><input style={inputStyle} name="email" value={formData.email} onChange={handleChange} /></div>
                    <div style={{ gridColumn: 'span 3' }}><label style={labelStyle}>Street Address</label><input style={inputStyle} name="address" value={formData.address} onChange={handleChange} required /></div>
                    <div><label style={labelStyle}>City</label><input style={inputStyle} name="city" value={formData.city} onChange={handleChange} /></div>
                    <div><label style={labelStyle}>State</label><input style={inputStyle} name="state" value={formData.state} onChange={handleChange} /></div>
                    <div><label style={labelStyle}>Zip Code</label><input style={inputStyle} name="zip_code" value={formData.zip_code} onChange={handleChange} /></div>
                  </div>
                </div>

                {/* 2. Insurance & Coverage Card */}
                <div style={cardStyle}>
                  <div style={sectionHeaderStyle}>🛡️ Insurance & Coverage</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div><label style={labelStyle}>Medicare ID</label><input style={inputStyle} name="medicare_id" value={formData.medicare_id} onChange={handleChange} /></div>
                    <div><label style={labelStyle}>Primary Insurance Company</label><input style={inputStyle} name="insurance_provider" value={formData.insurance_provider} onChange={handleChange} /></div>
                    <div><label style={labelStyle}>Insurance Policy / Member ID</label><input style={inputStyle} name="insurance_policy_num" value={formData.insurance_policy_num} onChange={handleChange} /></div>
                    <div><label style={labelStyle}>Insurance Group Number</label><input style={inputStyle} name="insurance_group_num" value={formData.insurance_group_num} onChange={handleChange} /></div>
                    <div><label style={labelStyle}>Secondary Insurance</label><input style={inputStyle} name="secondary_insurance" value={formData.secondary_insurance} onChange={handleChange} /></div>
                    <div><label style={labelStyle}>Secondary Policy ID</label><input style={inputStyle} name="secondary_policy_num" value={formData.secondary_policy_num} onChange={handleChange} /></div>
                  </div>
                </div>

                {/* 3. Doctor & Emergency Contacts Card */}
                <div style={cardStyle}>
                  <div style={sectionHeaderStyle}>🩺 Doctor & Emergency Contacts</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div><label style={labelStyle}>Primary Doctor Name</label><input style={inputStyle} name="primary_doctor" value={formData.primary_doctor} onChange={handleChange} /></div>
                    <div><label style={labelStyle}>Doctor Phone Number</label><input style={inputStyle} name="primary_doctor_phone" value={formData.primary_doctor_phone} onChange={handleChange} /></div>
                    <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>Known Allergies</label><input style={inputStyle} name="allergies" value={formData.allergies} onChange={handleChange} placeholder="e.g. Penicillin, Latex, Peanuts" /></div>
                    <div><label style={labelStyle}>Emergency Contact Name</label><input style={inputStyle} name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleChange} /></div>
                    <div><label style={labelStyle}>Relationship</label><input style={inputStyle} name="emergency_contact_relationship" value={formData.emergency_contact_relationship} onChange={handleChange} placeholder="e.g. Son, Daughter, Neighbor" /></div>
                    <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>Emergency Contact Phone</label><input style={inputStyle} name="emergency_contact_phone" value={formData.emergency_contact_phone} onChange={handleChange} /></div>
                  </div>
                </div>

                {/* Form Action Buttons */}
                <div style={{ marginTop: '24px', display: 'flex', gap: '16px' }}>
                  <button type="submit" style={{ padding: '16px 36px', fontSize: '20px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                    💾 Save Profile Data
                  </button>
                  {profile && (
                    <button type="button" onClick={() => setIsEditing(false)} style={{ padding: '16px 36px', fontSize: '20px', backgroundColor: '#DC2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                      ✖ Cancel
                    </button>
                  )}
                </div>
              </form>
            ) : (
              <div>
                {/* 1. Personal Details View Card */}
                <div style={cardStyle}>
                  <div style={sectionHeaderStyle}>👤 Personal Details</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', fontSize: '20px', color: '#1E293B' }}>
                    <p><strong>Name:</strong> {profile?.first_name} {profile?.middle_name ? `${profile.middle_name} ` : ''}{profile?.last_name}</p>
                    <p><strong>DOB:</strong> {profile?.dob}</p>
                    <p><strong>Gender/Sex:</strong> {profile?.gender || 'Not entered'}</p>
                    <p><strong>SSN (Last 4):</strong> {profile?.ssn_last4 ? `***-**-${profile.ssn_last4}` : 'Not entered'}</p>
                    <p><strong>Phone:</strong> {profile?.phone}</p>
                    <p><strong>Email:</strong> {profile?.email || 'Not entered'}</p>
                    <p style={{ gridColumn: 'span 3' }}><strong>Address:</strong> {profile?.address}{profile?.city ? `, ${profile.city}` : ''}{profile?.state ? `, ${profile.state}` : ''}{profile?.zip_code ? ` ${profile.zip_code}` : ''}</p>
                  </div>
                </div>

                {/* 2. Insurance & Coverage View Card */}
                <div style={cardStyle}>
                  <div style={sectionHeaderStyle}>🛡️ Insurance & Coverage</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '20px', color: '#1E293B' }}>
                    <p><strong>Medicare ID:</strong> {profile?.medicare_id || 'Not entered'}</p>
                    <p><strong>Primary Insurance:</strong> {profile?.insurance_provider || 'Not entered'}</p>
                    <p><strong>Policy / Member ID:</strong> {profile?.insurance_policy_num || 'Not entered'}</p>
                    <p><strong>Group Number:</strong> {profile?.insurance_group_num || 'Not entered'}</p>
                    <p><strong>Secondary Insurance:</strong> {profile?.secondary_insurance || 'Not entered'}</p>
                    <p><strong>Secondary Policy ID:</strong> {profile?.secondary_policy_num || 'Not entered'}</p>
                  </div>
                </div>

                {/* 3. Doctor & Emergency Contacts View Card */}
                <div style={cardStyle}>
                  <div style={sectionHeaderStyle}>🩺 Doctor & Emergency Contacts</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '20px', color: '#1E293B' }}>
                    <p><strong>Primary Doctor:</strong> {profile?.primary_doctor || 'Not entered'}</p>
                    <p><strong>Doctor Phone:</strong> {profile?.primary_doctor_phone || 'Not entered'}</p>
                    <p style={{ gridColumn: 'span 2' }}><strong>Known Allergies:</strong> <span style={{ color: profile?.allergies ? '#DC2626' : '#1E293B', fontWeight: profile?.allergies ? 'bold' : 'normal' }}>{profile?.allergies || 'None listed'}</span></p>
                    <p><strong>Emergency Contact:</strong> {profile?.emergency_contact_name || 'Not entered'}{profile?.emergency_contact_relationship ? ` (${profile.emergency_contact_relationship})` : ''}</p>
                    <p><strong>Emergency Phone:</strong> {profile?.emergency_contact_phone || 'Not entered'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MEDICATIONS */}
        {activeTab === 'meds' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '32px', margin: 0, color: '#0F172A' }}>Daily Medications</h2>
              {!isAddingMed && (
                <button 
                  onClick={() => setIsAddingMed(true)}
                  style={{ padding: '12px 28px', fontSize: '20px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  ➕ Add New Medication
                </button>
              )}
            </div>

            {/* Add Medication Form */}
            {isAddingMed && (
              <div style={cardStyle}>
                <div style={sectionHeaderStyle}>💊 Add Prescription Details</div>
                <form onSubmit={handleSaveMed}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div><label style={labelStyle}>Medication Name</label><input style={inputStyle} name="name" value={medFormData.name} onChange={handleMedChange} placeholder="e.g. Lisinopril" required /></div>
                    <div><label style={labelStyle}>Dosage</label><input style={inputStyle} name="dosage" value={medFormData.dosage} onChange={handleMedChange} placeholder="e.g. 10 mg" required /></div>
                    <div style={{ gridColumn: 'span 2' }}><label style={labelStyle}>Frequency / Instructions</label><input style={inputStyle} name="frequency" value={medFormData.frequency} onChange={handleMedChange} placeholder="e.g. Take 1 tablet every morning with water" required /></div>
                    <div><label style={labelStyle}>Prescribing Doctor</label><input style={inputStyle} name="prescribing_doctor" value={medFormData.prescribing_doctor} onChange={handleMedChange} placeholder="e.g. Dr. Smith" /></div>
                    <div><label style={labelStyle}>Special Notes</label><input style={inputStyle} name="instructions" value={medFormData.instructions} onChange={handleMedChange} placeholder="e.g. Avoid taking with grapefruit juice" /></div>
                  </div>
                  <div style={{ marginTop: '20px', display: 'flex', gap: '16px' }}>
                    <button type="submit" style={{ padding: '14px 28px', fontSize: '18px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                      💾 Save Medication
                    </button>
                    <button type="button" onClick={() => setIsAddingMed(false)} style={{ padding: '14px 28px', fontSize: '18px', backgroundColor: '#DC2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                      ✖ Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* List of Medications */}
            {medications.length === 0 ? (
              <div style={cardStyle}>
                <p style={{ fontSize: '20px', color: '#64748B', margin: 0 }}>No medications listed yet. Click "Add New Medication" above to add her first prescription.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '20px' }}>
                {medications.map((med) => (
                  <div key={med.id} style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h3 style={{ fontSize: '26px', margin: '0 0 8px 0', color: '#0F172A' }}>
                          💊 {med.name} <span style={{ fontSize: '22px', color: '#2563EB' }}>({med.dosage})</span>
                        </h3>
                        <p style={{ fontSize: '20px', margin: '4px 0', color: '#334155' }}>
                          <strong>How to take:</strong> {med.frequency}
                        </p>
                        {med.prescribing_doctor && (
                          <p style={{ fontSize: '18px', margin: '4px 0', color: '#475569' }}>
                            <strong>Prescribed by:</strong> {med.prescribing_doctor}
                          </p>
                        )}
                        {med.instructions && (
                          <p style={{ fontSize: '18px', margin: '4px 0', color: '#64748B' }}>
                            <strong>Notes:</strong> {med.instructions}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteMed(med.id)}
                        style={{ padding: '10px 18px', fontSize: '16px', backgroundColor: '#FEE2E2', color: '#DC2626', border: '2px solid #FCA5A5', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: APPOINTMENTS */}
        {activeTab === 'appts' && (() => {
          const year = calendarMonth.getFullYear()
          const month = calendarMonth.getMonth()
          const firstDayIndex = new Date(year, month, 1).getDay()
          const daysInMonth = new Date(year, month + 1, 0).getDate()
          const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
          
          const daysArray = []
          for (let i = 0; i < firstDayIndex; i++) daysArray.push(null)
          for (let d = 1; d <= daysInMonth; d++) daysArray.push(d)

          const selectedAppts = appointments.filter(a => a.appointment_date === selectedDate)

          return (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '32px', margin: 0, color: '#0F172A' }}>Appointments & Visit Schedule</h2>
                <button 
                  onClick={() => setIsAddingAppt(true)}
                  style={{ padding: '12px 28px', fontSize: '20px', backgroundColor: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  📅 Schedule Visit for {selectedDate}
                </button>
              </div>

              {/* Form Modal / Card */}
              {isAddingAppt && (
                <div style={cardStyle}>
                  <div style={sectionHeaderStyle}>📝 New Appointment Details for {selectedDate}</div>
                  <form onSubmit={handleSaveAppt}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={labelStyle}>Appointment Title / Reason</label>
                        <input style={inputStyle} name="title" value={apptFormData.title} onChange={handleApptChange} placeholder="e.g. Cardiology Checkup" required />
                      </div>
                      <div>
                        <label style={labelStyle}>Doctor / Clinic Name</label>
                        <input style={inputStyle} name="doctor_name" value={apptFormData.doctor_name} onChange={handleApptChange} placeholder="e.g. Dr. Roberts" />
                      </div>
                      <div>
                        <label style={labelStyle}>Time</label>
                        <input type="time" style={inputStyle} name="appointment_time" value={apptFormData.appointment_time} onChange={handleApptChange} required />
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={labelStyle}>Location / Building Address</label>
                        <input style={inputStyle} name="location" value={apptFormData.location} onChange={handleApptChange} placeholder="e.g. 104 Medical Parkway, Suite 200" />
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={labelStyle}>Prep Notes / Reminders</label>
                        <input style={inputStyle} name="notes" value={apptFormData.notes} onChange={handleApptChange} placeholder="e.g. Fast for 12 hours before blood draw" />
                      </div>
                    </div>
                    <div style={{ marginTop: '20px', display: 'flex', gap: '16px' }}>
                      <button type="submit" style={{ padding: '14px 28px', fontSize: '18px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                        💾 Save Appointment
                      </button>
                      <button type="button" onClick={() => setIsAddingAppt(false)} style={{ padding: '14px 28px', fontSize: '18px', backgroundColor: '#DC2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                        ✖ Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Main Calendar split layout */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>
                
                {/* Left: Senior Month Grid */}
                <div style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <button 
                      onClick={() => setCalendarMonth(new Date(year, month - 1, 1))}
                      style={{ padding: '10px 18px', fontSize: '18px', backgroundColor: '#E2E8F0', border: '2px solid #94A3B8', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      ⬅️ Previous
                    </button>
                    <span style={{ fontSize: '26px', fontWeight: 'bold', color: '#0F172A' }}>
                      {monthNames[month]} {year}
                    </span>
                    <button 
                      onClick={() => setCalendarMonth(new Date(year, month + 1, 1))}
                      style={{ padding: '10px 18px', fontSize: '18px', backgroundColor: '#E2E8F0', border: '2px solid #94A3B8', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Next ➡️
                    </button>
                  </div>

                  {/* Days of Week Header */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center', fontWeight: 'bold', fontSize: '16px', color: '#475569', marginBottom: '8px' }}>
                    <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                  </div>

                  {/* Month Grid Cells */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                    {daysArray.map((dayNum, index) => {
                      if (!dayNum) return <div key={index} style={{ height: '70px' }}></div>
                      
                      const formattedDay = dayNum < 10 ? `0${dayNum}` : `${dayNum}`
                      const formattedMonth = (month + 1) < 10 ? `0${month + 1}` : `${month + 1}`
                      const dateStr = `${year}-${formattedMonth}-${formattedDay}`
                      
                      const isSelected = dateStr === selectedDate
                      const isToday = dateStr === todayStr
                      const dayAppts = appointments.filter(a => a.appointment_date === dateStr)

                      return (
                        <div
                          key={index}
                          onClick={() => setSelectedDate(dateStr)}
                          style={{
                            height: '75px',
                            border: isSelected ? '4px solid #2563EB' : '2px solid #CBD5E1',
                            borderRadius: '8px',
                            backgroundColor: isSelected ? '#EFF6FF' : isToday ? '#FEF3C7' : '#FFFFFF',
                            padding: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            justify: 'space-between'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '20px', fontWeight: 'bold', color: isSelected ? '#2563EB' : '#0F172A' }}>{dayNum}</span>
                            {isToday && <span style={{ fontSize: '11px', fontWeight: 'bold', backgroundColor: '#D97706', color: 'white', padding: '2px 4px', borderRadius: '4px' }}>TODAY</span>}
                          </div>
                          {dayAppts.length > 0 && (
                            <div style={{ backgroundColor: '#2563EB', color: 'white', fontSize: '12px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '10px', textAlign: 'center' }}>
                              {dayAppts.length} Visit{dayAppts.length > 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Right: Selected Day Agenda */}
                <div>
                  <div style={cardStyle}>
                    <div style={sectionHeaderStyle}>📋 Agenda for {selectedDate}</div>
                    
                    {selectedAppts.length === 0 ? (
                      <p style={{ fontSize: '18px', color: '#64748B', margin: '20px 0' }}>No appointments scheduled for this day.</p>
                    ) : (
                      <div style={{ display: 'grid', gap: '16px' }}>
                        {selectedAppts.map((appt) => (
                          <div 
                            key={appt.id} 
                            style={{ 
                              padding: '16px', 
                              borderRadius: '8px', 
                              border: appt.completed ? '2px solid #86EFAC' : '2px solid #CBD5E1',
                              backgroundColor: appt.completed ? '#F0FDF4' : '#FFFFFF'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <h4 style={{ fontSize: '22px', margin: '0 0 6px 0', color: appt.completed ? '#166534' : '#0F172A', textDecoration: appt.completed ? 'line-through' : 'none' }}>
                                  ⏰ {appt.appointment_time} - {appt.title}
                                </h4>
                                {appt.doctor_name && <p style={{ fontSize: '18px', margin: '4px 0', color: '#334155' }}><strong>Doctor:</strong> {appt.doctor_name}</p>}
                                {appt.location && <p style={{ fontSize: '18px', margin: '4px 0', color: '#334155' }}><strong>Location:</strong> {appt.location}</p>}
                                {appt.notes && <p style={{ fontSize: '16px', margin: '4px 0', color: '#64748B' }}><strong>Prep Notes:</strong> {appt.notes}</p>}
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                              <button
                                onClick={() => handleToggleAppt(appt.id, Boolean(appt.completed))}
                                style={{
                                  padding: '8px 16px',
                                  fontSize: '16px',
                                  backgroundColor: appt.completed ? '#DCFCE7' : '#DBEAFE',
                                  color: appt.completed ? '#15803D' : '#1D4ED8',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontWeight: 'bold'
                                }}
                              >
                                {appt.completed ? '✅ Completed' : '⏳ Mark Done'}
                              </button>
                              <button
                                onClick={() => handleDeleteAppt(appt.id)}
                                style={{ padding: '8px 14px', fontSize: '16px', backgroundColor: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )
        })()}

        {/* TAB 4: PASSWORDS & LOGINS */}
        {activeTab === 'creds' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '32px', margin: 0, color: '#0F172A' }}>Passwords & Portal Logins</h2>
              {!isAddingCred && (
                <button 
                  onClick={() => setIsAddingCred(true)}
                  style={{ padding: '12px 28px', fontSize: '20px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  🔑 Add New Account / Portal
                </button>
              )}
            </div>

            {/* Add Credential Form */}
            {isAddingCred && (
              <div style={cardStyle}>
                <div style={sectionHeaderStyle}>🔐 Add Portal Login Details</div>
                <form onSubmit={handleSaveCred}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={labelStyle}>Portal / Service Name</label>
                      <input style={inputStyle} name="service_name" value={credFormData.service_name} onChange={handleCredChange} placeholder="e.g. MyChart Patient Portal, Medicare.gov" required />
                    </div>
                    <div>
                      <label style={labelStyle}>Username / Email / ID</label>
                      <input style={inputStyle} name="username" value={credFormData.username} onChange={handleCredChange} placeholder="e.g. mom_smith73 or email@example.com" required />
                    </div>
                    <div>
                      <label style={labelStyle}>Password</label>
                      <input style={inputStyle} name="password" value={credFormData.password} onChange={handleCredChange} placeholder="Enter password" required />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={labelStyle}>Website Address (URL)</label>
                      <input style={inputStyle} name="url" value={credFormData.url} onChange={handleCredChange} placeholder="e.g. https://www.mychart.com" />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={labelStyle}>Notes / Security Questions</label>
                      <input style={inputStyle} name="notes" value={credFormData.notes} onChange={handleCredChange} placeholder="e.g. Security question answer: Fluffy" />
                    </div>
                  </div>
                  <div style={{ marginTop: '20px', display: 'flex', gap: '16px' }}>
                    <button type="submit" style={{ padding: '14px 28px', fontSize: '18px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                      💾 Save Account Info
                    </button>
                    <button type="button" onClick={() => setIsAddingCred(false)} style={{ padding: '14px 28px', fontSize: '18px', backgroundColor: '#DC2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                      ✖ Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Credentials Card List */}
            {credentials.length === 0 ? (
              <div style={cardStyle}>
                <p style={{ fontSize: '20px', color: '#64748B', margin: 0 }}>No login credentials stored yet. Click "Add New Account / Portal" above to save her first portal password.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {credentials.map((cred) => {
                  const isPasswordVisible = Boolean(showPasswords[cred.id])
                  return (
                    <div key={cred.id} style={cardStyle}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <h3 style={{ fontSize: '24px', margin: 0, color: '#0F172A' }}>
                          🏥 {cred.service_name}
                        </h3>
                        <button
                          onClick={() => handleDeleteCred(cred.id)}
                          style={{ padding: '6px 12px', fontSize: '14px', backgroundColor: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          🗑️ Delete
                        </button>
                      </div>

                      <div style={{ fontSize: '19px', lineHeight: '1.8', color: '#1E293B' }}>
                        <p style={{ margin: '4px 0' }}><strong>Username:</strong> {cred.username}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '6px 0' }}>
                          <p style={{ margin: 0 }}>
                            <strong>Password:</strong> {isPasswordVisible ? cred.password : '••••••••••••'}
                          </p>
                          <button
                            onClick={() => togglePasswordVisibility(cred.id)}
                            style={{ padding: '4px 10px', fontSize: '14px', backgroundColor: '#E2E8F0', border: '1px solid #94A3B8', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                          >
                            {isPasswordVisible ? '🙈 Hide' : '👁️ Show'}
                          </button>
                        </div>
                        {cred.url && (
                          <p style={{ margin: '6px 0' }}>
                            <a 
                              href={cred.url.startsWith('http') ? cred.url : `https://${cred.url}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              style={{ color: '#2563EB', fontWeight: 'bold', textDecoration: 'underline' }}
                            >
                              🌐 Open Portal Website
                            </a>
                          </p>
                        )}
                        {cred.notes && (
                          <p style={{ margin: '6px 0 0 0', fontSize: '17px', color: '#475569', backgroundColor: '#F8FAFC', padding: '10px', borderRadius: '6px', borderLeft: '4px solid #94A3B8' }}>
                            <strong>Notes:</strong> {cred.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: RECORDS & PDF FORMS */}
        {activeTab === 'vault' && (
          <div>
            <h2 style={{ fontSize: '32px', margin: '0 0 24px 0', color: '#0F172A' }}>Medical Document Vault & PDF Auto-Filler</h2>

            {/* SECTION 1: PDF AUTO-FILL ENGINE */}
            <div style={cardStyle}>
              <div style={sectionHeaderStyle}>✨ Automated PDF Form Filler</div>
              <p style={{ fontSize: '18px', color: '#334155', marginTop: 0 }}>
                Select a blank medical PDF form from your computer. The engine will automatically match and fill in Mom's Master Profile data (Name, DOB, Medicare ID, Phone, Address, Doctors, Insurance) into the PDF fields.
              </p>

              <form onSubmit={handleAutofillPdf} style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setPdfFile(e.target.files ? e.target.files[0] : null)}
                    style={{ fontSize: '18px', padding: '10px', backgroundColor: '#F8FAFC', border: '2px solid #64748B', borderRadius: '6px' }}
                    required
                  />
                  <button
                    type="submit"
                    disabled={isAutofillLoading}
                    style={{
                      padding: '14px 28px',
                      fontSize: '20px',
                      backgroundColor: isAutofillLoading ? '#94A3B8' : '#2563EB',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: isAutofillLoading ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    {isAutofillLoading ? '⚙️ Auto-Filling PDF...' : '⚡ Auto-Fill PDF from Profile'}
                  </button>
                </div>
              </form>
            </div>

            {/* SECTION 2: DOCUMENT VAULT UPLOAD */}
            <div style={cardStyle}>
              <div style={sectionHeaderStyle}>📂 Upload Document to Medical Vault</div>
              <form onSubmit={handleUploadDocument}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>Select File (PDF, Image, Document)</label>
                    <input
                      type="file"
                      onChange={(e) => setSelectedDocFile(e.target.files ? e.target.files[0] : null)}
                      style={inputStyle}
                      required
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Category</label>
                    <select
                      value={docCategory}
                      onChange={(e) => setDocCategory(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="Lab Result">Lab Result / Bloodwork</option>
                      <option value="Insurance Claim">Insurance Claim / EOB</option>
                      <option value="ID Card">Medicare / Insurance Card</option>
                      <option value="Doctor Note">Doctor Visit Summary</option>
                      <option value="General Record">General Record</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={labelStyle}>Notes / Description</label>
                    <input
                      style={inputStyle}
                      value={docNotes}
                      onChange={(e) => setDocNotes(e.target.value)}
                      placeholder="e.g. Annual blood panel results from Dr. Smith"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isUploadingDoc}
                  style={{
                    padding: '14px 28px',
                    fontSize: '18px',
                    backgroundColor: isUploadingDoc ? '#94A3B8' : '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: isUploadingDoc ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    marginTop: '12px'
                  }}
                >
                  {isUploadingDoc ? '💾 Saving to Vault...' : '💾 Save Document to Vault'}
                </button>
              </form>
            </div>

            {/* SECTION 3: STORED DOCUMENTS LIST */}
            <div style={cardStyle}>
              <div style={sectionHeaderStyle}>📚 Stored Documents Catalog</div>
              {documents.length === 0 ? (
                <p style={{ fontSize: '18px', color: '#64748B', margin: 0 }}>No documents stored in the vault yet.</p>
              ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        padding: '16px',
                        borderRadius: '8px',
                        border: '2px solid #CBD5E1',
                        backgroundColor: '#FFFFFF',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <h4 style={{ fontSize: '22px', margin: '0 0 6px 0', color: '#0F172A' }}>
                          📄 {doc.file_name}
                        </h4>
                        <p style={{ fontSize: '18px', margin: '4px 0', color: '#334155' }}>
                          <strong>Category:</strong> {doc.category} | <strong>Uploaded:</strong> {doc.upload_date}
                        </p>
                        {doc.notes && (
                          <p style={{ fontSize: '16px', margin: '4px 0', color: '#64748B' }}>
                            <strong>Notes:</strong> {doc.notes}
                          </p>
                        )}
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: doc.synced ? '#059669' : '#D97706' }}>
                          {doc.synced ? '🟢 Synced to Pi Cloud (MinIO)' : '🟡 Saved Locally (Sync Pending)'}
                        </span>
                      </div>

                      <a
                        href={`${API_BASE}/api/documents/${doc.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: '10px 20px',
                          fontSize: '16px',
                          backgroundColor: '#E2E8F0',
                          color: '#0F172A',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          fontWeight: 'bold',
                          border: '2px solid #94A3B8'
                        }}
                      >
                        ⬇️ Download / View File
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 6: CALL & INSURANCE LOG */}
        {activeTab === 'logs' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '32px', margin: 0, color: '#0F172A' }}>Call & Insurance Log</h2>
              {!isAddingLog && (
                <button 
                  onClick={() => setIsAddingLog(true)}
                  style={{ padding: '12px 28px', fontSize: '20px', backgroundColor: '#2563EB', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  📞 Log a New Call
                </button>
              )}
            </div>

            {/* Add Log Form */}
            {isAddingLog && (
              <div style={cardStyle}>
                <div style={sectionHeaderStyle}>📝 Record Call Details</div>
                <form onSubmit={handleSaveLog}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={labelStyle}>Date of Call</label>
                      <input type="date" style={inputStyle} name="date" value={logFormData.date} onChange={handleLogChange} required />
                    </div>
                    <div>
                      <label style={labelStyle}>Category</label>
                      <select style={inputStyle} name="category" value={logFormData.category} onChange={handleLogChange}>
                        <option value="Insurance">Insurance / Medicare</option>
                        <option value="Billing">Hospital Billing</option>
                        <option value="Doctor">Doctor's Office</option>
                        <option value="Pharmacy">Pharmacy</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={labelStyle}>Subject / Reason for Call</label>
                      <input style={inputStyle} name="subject" value={logFormData.subject} onChange={handleLogChange} placeholder="e.g. Dispute unexpected lab charge" required />
                    </div>
                    <div>
                      <label style={labelStyle}>Person Spoken To (Rep Name)</label>
                      <input style={inputStyle} name="person_spoken_to" value={logFormData.person_spoken_to} onChange={handleLogChange} placeholder="e.g. Sarah M." />
                    </div>
                    <div>
                      <label style={labelStyle}>Confirmation / Reference Number</label>
                      <input style={inputStyle} name="ref_number" value={logFormData.ref_number} onChange={handleLogChange} placeholder="e.g. #REF-994821" />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={labelStyle}>Notes / Outcome</label>
                      <input style={inputStyle} name="notes" value={logFormData.notes} onChange={handleLogChange} placeholder="e.g. They said it will be reprocessed in 5-7 business days." />
                    </div>
                    <div>
                      <label style={labelStyle}>Follow-up Needed By (Optional)</label>
                      <input type="date" style={inputStyle} name="follow_up_date" value={logFormData.follow_up_date} onChange={handleLogChange} />
                    </div>
                  </div>
                  <div style={{ marginTop: '20px', display: 'flex', gap: '16px' }}>
                    <button type="submit" style={{ padding: '14px 28px', fontSize: '18px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                      💾 Save Call Record
                    </button>
                    <button type="button" onClick={() => setIsAddingLog(false)} style={{ padding: '14px 28px', fontSize: '18px', backgroundColor: '#DC2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                      ✖ Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Log List */}
            {logs.length === 0 ? (
              <div style={cardStyle}>
                <p style={{ fontSize: '20px', color: '#64748B', margin: 0 }}>No calls logged yet. Keep track of insurance disputes or doctor instructions here.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '16px' }}>
                {logs.map((log) => (
                  <div key={log.id} style={{ ...cardStyle, borderLeft: log.resolved ? '6px solid #10B981' : '6px solid #F59E0B' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ backgroundColor: '#E2E8F0', padding: '4px 10px', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', color: '#475569' }}>
                            {log.category}
                          </span>
                          <span style={{ fontSize: '16px', color: '#64748B', fontWeight: 'bold' }}>{log.date}</span>
                          {log.resolved ? (
                            <span style={{ backgroundColor: '#D1FAE5', color: '#065F46', padding: '4px 10px', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold' }}>✅ Resolved</span>
                          ) : (
                            <span style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: '4px 10px', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold' }}>⏳ Action Needed</span>
                          )}
                        </div>
                        
                        <h4 style={{ fontSize: '22px', margin: '4px 0', color: '#0F172A' }}>{log.subject}</h4>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px', fontSize: '18px', color: '#334155' }}>
                          <p style={{ margin: 0 }}><strong>Spoke With:</strong> {log.person_spoken_to || 'N/A'}</p>
                          <p style={{ margin: 0 }}><strong>Ref #:</strong> <span style={{ backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>{log.ref_number || 'N/A'}</span></p>
                          <p style={{ margin: 0, gridColumn: 'span 2' }}><strong>Notes:</strong> {log.notes || 'None'}</p>
                          {log.follow_up_date && (
                            <p style={{ margin: 0, color: '#DC2626', fontWeight: 'bold' }}>⚠️ Follow-up by: {log.follow_up_date}</p>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button
                          onClick={() => handleToggleLog(log.id, Boolean(log.resolved))}
                          style={{ padding: '8px 16px', fontSize: '16px', backgroundColor: log.resolved ? '#F3F4F6' : '#DBEAFE', color: log.resolved ? '#4B5563' : '#1D4ED8', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          {log.resolved ? 'Mark as Unresolved' : '✅ Mark Resolved'}
                        </button>
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          style={{ padding: '8px 16px', fontSize: '16px', backgroundColor: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </>
    )}
    </div>
  )
}

export default App
