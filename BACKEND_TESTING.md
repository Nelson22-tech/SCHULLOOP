# SchulLoop Backend Testing

1. Install Node.js LTS and reopen VS Code.
2. In `backend/.env`, set `MONGO_URI` and a random `JWT_SECRET` of at least 32 characters.
3. From `backend/`: `npm install` then `npm start`.
4. Open `http://localhost:5000/api/health`. Expected JSON includes `status: "ok"` and `database: "connected"`.
5. Create an account from the app or test `POST /api/auth/signup`.
6. Login and use the returned Bearer token for protected endpoints.
7. For Socket.IO chat, the client sends the token as `auth.token`; unauthenticated socket connections are rejected.
8. Public school search only returns verified schools.

## Important Expo testing note
The current project uses Expo SDK 54 but contains older React Native/React dependency versions. After Node is working, run `npx expo install --fix` from the project root so Expo selects SDK-compatible dependency versions, then run `npx expo start`.

## Device API URL
`localhost` points to the device itself when testing on a physical phone. Set `EXPO_PUBLIC_API_BASE_URL` to the computer's LAN address, for example `http://192.168.1.10:5000/api`, and make sure Windows Firewall permits port 5000.
