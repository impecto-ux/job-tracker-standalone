const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1400,
        height: 900,
        titleCellStyle: 'hidden', // Modern header on macOS, customizable on Windows
        autoHideMenuBar: true,    // Hide File/Edit menu
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        icon: path.join(__dirname, 'icon.png') // Placeholder for icon
    });

    // In development, load the running web server
    // In production, we would load the build file: win.loadFile('dist/index.html')
    win.loadURL('http://localhost:3000');
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
