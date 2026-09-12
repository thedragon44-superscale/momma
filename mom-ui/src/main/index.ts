import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { spawn } from 'child_process' // <-- Import child_process

let pythonProcess = null;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Load the React Vite dev server or the production build
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.momhealth.app')

  // BOOT THE PYTHON BACKEND SILENTLY
  // Assuming the mom-ui folder is inside the main 'mom' folder
  // const pythonExecutable = join(__dirname, '../../../venv/Scripts/python.exe') // Windows
  const pythonExecutable = join(__dirname, '../../../venv/bin/python') // Mac/Linux
  const pythonScript = join(__dirname, '../../../main.py')

  pythonProcess = spawn(pythonExecutable, ['-m', 'uvicorn', 'main:app', '--port', '8000'], {
    cwd: join(__dirname, '../../../') // Run it from the root 'mom' folder
  })

  pythonProcess.stdout.on('data', (data) => console.log(`Python: ${data}`))
  pythonProcess.stderr.on('data', (data) => console.error(`Python Error: ${data}`))

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// KILL PYTHON WHEN THE APP CLOSES
app.on('window-all-closed', () => {
  if (pythonProcess) {
    pythonProcess.kill()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
