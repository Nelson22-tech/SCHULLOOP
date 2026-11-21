# Getting Started with Global School Finder - Quick Start Guide

Your React Native mobile app is now ready! Here's everything you need to know to get started.

## ✅ What's Been Created

We've set up a complete React Native Expo project with:

### Project Structure
```
GlobalSchoolFinder/
├── src/
│   ├── screens/              # App screens
│   │   ├── HomeScreen.js     # School discovery & listing
│   │   ├── LoginScreen.js    # User authentication
│   │   ├── SignupScreen.js   # User registration
│   │   ├── ChatScreen.js     # Real-time messaging
│   │   ├── AdminDashboardScreen.js  # Admin panel
│   │   └── GraduateTalentPortalScreen.js  # Job/Talent matching
│   ├── services/
│   │   └── apiService.js     # API calls & requests
│   ├── context/
│   │   └── AuthContext.js    # Authentication state
│   ├── navigation/
│   │   └── RootNavigator.js  # App navigation structure
│   └── config/
│       ├── api.js            # API configuration
│       ├── firebase.js       # Firebase setup
│       └── flutterwave.js    # Payment config
├── App.jsx                   # Main app entry point
├── package.json              # Project dependencies
├── .env.example              # Environment variables template
└── SETUP_GUIDE.md            # Full setup documentation
```

## 🚀 Next Steps

### Step 1: Install Dependencies
After the npm installation completes, you need to add the additional packages:

```bash
cd GlobalSchoolFinder

# Navigate into the project folder
npm install @react-navigation/native-stack
npm install @react-native-async-storage/async-storage
npm install firebase
npm install axios
```

### Step 2: Set Up Environment Variables
```bash
# Copy the example to create your .env file
cp .env.example .env

# Edit .env with your actual credentials:
```

You need to get credentials for:

1. **Firebase** - https://console.firebase.google.com
   - Create a new project
   - Get your API keys
   
2. **Flutterwave** - https://dashboard.flutterwave.com
   - Sign up and get API keys
   
3. **Backend API** - Your Node.js + MongoDB server
   - Default: `http://localhost:5000/api`

### Step 3: Start the Development Server

```bash
npm start

# You'll see a QR code and options:
# Press 'i' for iOS simulator
# Press 'a' for Android emulator
# Scan QR with Expo Go app on your phone
```

## 📱 Main Features Implemented

### 1. **Authentication System** ✓
- Login screen ready
- Sign-up screen ready
- Auth context for state management
- Token storage in local device

### 2. **School Discovery** ✓
- Home screen with school listings
- API integration for fetching schools
- Error handling and loading states

### 3. **Real-time Chat** ✓
- Chat screen component
- Message UI ready
- Prepared for Firebase integration

### 4. **Admin Dashboard** ✓
- School verification interface
- Approve/reject functionality
- Pending schools list

### 5. **Graduate Talent Portal** ✓
- Job listings display
- Graduate profiles search
- Employer connections

## 🔧 Configuration Files Explained

### `.env.example` → `.env`
Contains all sensitive credentials (API keys, database URLs, etc.)

### `src/config/api.js`
Define API endpoints and request configuration

### `src/config/firebase.js`
Firebase initialization and configuration

### `src/config/flutterwave.js`
Payment gateway configuration

## 📚 Architecture Overview

The app uses:

- **React Navigation** - Screen navigation (tabs + stack)
- **Context API** - Global state management for auth
- **AsyncStorage** - Local data persistence
- **Firebase** - Real-time chat and notifications (when added)
- **REST API** - Backend communication via Axios/fetch

## 🎯 What You Have

| Feature | Status | What's Included |
|---------|--------|-----------------|
| Navigation | ✅ | Tab-based + Stack navigation ready |
| Authentication | ✅ | Auth context, Login/Signup screens |
| API Integration | ✅ | API service layer with error handling |
| School Listing | ✅ | Home screen with school display |
| Chat UI | ✅ | Chat screen with message display |
| Admin Panel | ✅ | Admin dashboard for verification |
| Talent Portal | ✅ | Job/Graduate matching interface |
| Offline Support | 🔲 | AsyncStorage ready for caching |
| Real-time Chat | 🔲 | Firebase integration needed |
| Payments | 🔲 | Flutterwave config ready |

## 🛠️ Development Workflow

### Making Changes
1. Edit files in `src/` folder
2. Save and the app auto-reloads
3. Check your device/simulator

### Adding New Screens
1. Create new file in `src/screens/`
2. Add to navigation in `src/navigation/RootNavigator.js`
3. Import and use

### Adding API Calls
1. Add endpoint in `src/config/api.js`
2. Create method in `src/services/apiService.js`
3. Use in your screens

## 📖 Common Tasks

### To run on Android emulator:
```bash
npm run android
```

### To run on iOS simulator:
```bash
npm run ios
```

### To run on web:
```bash
npm run web
```

### To check for linting issues:
```bash
npm run lint
```

## 🐛 Troubleshooting

**Port 8081 already in use:**
```bash
# Windows - Find process using port 8081
netstat -ano | findstr :8081
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :8081
kill -9 <PID>
```

**Module not found errors:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm start
```

**Expo Go crashes:**
```bash
# Try resetting the project
npm run reset-project
npm start
```

## 📂 File Descriptions

| File | Purpose |
|------|---------|
| `App.jsx` | Entry point, Auth provider setup |
| `RootNavigator.js` | Navigation structure & screens |
| `apiService.js` | All HTTP requests/API calls |
| `AuthContext.js` | Authentication state management |
| `HomeScreen.js` | Main school listing interface |
| `ChatScreen.js` | Messaging interface |
| `AdminDashboardScreen.js` | Admin controls |

## 🎓 Learning Resources

- React Native Docs: https://reactnative.dev
- Expo Documentation: https://docs.expo.dev
- React Navigation: https://reactnavigation.org
- Firebase: https://firebase.google.com/docs
- Flutterwave: https://developer.flutterwave.com

## 📝 Next - Backend Setup

You'll need to create the backend Node.js/Express API:

**Endpoints you need:**
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `GET /api/schools` - List schools
- `GET /api/schools/:id` - Get school details
- `POST /api/messages` - Send message
- `GET /api/conversations` - Get chats

The API service (`src/services/apiService.js`) is already configured to call these!

## ✨ Pro Tips

1. **Hot Reload** - Changes auto-update without full restart
2. **Logs** - Check terminal for app logs and errors
3. **Performance** - Use React DevTools to debug
4. **Testing** - Start with basic screens before adding features
5. **Code Organization** - Keep similar files together (all screens in screens/)

## 💡 Your Next Steps

1. ✅ npm install additional packages
2. ✅ Create `.env` file with credentials
3. ✅ Run `npm start`
4. ✅ Test on device/simulator
5. ✅ Build backend API
6. ✅ Connect to real database
7. ✅ Add real authentication
8. ✅ Implement Firebase chat
9. ✅ Add payment integration
10. ✅ Deploy to App Store / Play Store

---

**Happy coding! 🚀**

Need help? Check the SETUP_GUIDE.md for detailed configuration instructions.

## Local backend setup (Windows)

The backend now creates `backend/.env` automatically if it is missing. The default local MongoDB URI is:

`mongodb://127.0.0.1:27017/schulloop`

Start it with:

```powershell
cd backend
npm install
npm start
```

Then verify:

`http://localhost:5000/api/health`

For a physical Expo device, the frontend automatically replaces a localhost API host with the Expo/Metro development host IP. Keep the phone and PC on the same Wi-Fi/LAN.
