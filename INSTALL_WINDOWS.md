# Windows installation

1. Install Node.js 22 LTS or newer (Expo SDK 57 requires Node.js 22.13+).
2. Extract SchulLoop.
3. Open PowerShell in the `Schulloop` folder.
4. Run:

```powershell
npm install
npx expo install --fix
npx expo-doctor
```

5. Start Expo:

```powershell
npx expo start
```

6. In a second PowerShell window:

```powershell
cd backend
npm install
npm start
```

For a physical phone, keep the PC and phone on the same network. The existing API resolver will replace localhost with the Expo/Metro host during development.
