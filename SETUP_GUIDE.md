# Global School Finder - React Native Mobile App

A comprehensive mobile application for discovering schools worldwide, with integrated features for communication, payments, admin management, and graduate employment connections.

## Features

### 🎓 School Discovery
- Search and filter schools by location, type, fees
- AI-powered recommendations
- Detailed school profiles with images and reviews
- Location-based discovery (nearby schools)

### 💬 Real-time Chat
- Direct communication with school administrators
- Conversation history and management
- Push notifications for new messages

### 💳 Payment Integration
- Multiple payment methods (Mobile Money, Cards, Bank Transfer, USSD)
- Flutterwave integration for global transactions
- Transaction history and receipts
- Payment tracking and status verification

### 🛡️ Admin Dashboard
- School verification system
- Content management
- User management
- Analytics and reporting

### 👨‍🎓 Graduate Talent Portal
- Graduate profiles and CV management
- Job listings from employers
- Direct employer-graduate connections
- Employment tracking

### 📱 Offline Features
- Offline caching of school data
- Service worker for PWA support
- Sync when connection restored

## Tech Stack

**Frontend:**
- React Native with Expo
- React Navigation for routing
- Context API for state management
- AsyncStorage for local data management

**Backend:**
- Node.js with Express
- MongoDB for database
- Firebase for real-time chat and notifications
- Flutterwave for payments

**External Services:**
- Firebase (Auth, Realtime DB, Cloud Messaging)
- Flutterwave (Payment Processing)
- Google Maps API (Location Services)

## Project Structure

```
src/
├── screens/           # Screen components
│   ├── HomeScreen.js
│   ├── LoginScreen.js
│   ├── ChatScreen.js
│   ├── AdminDashboardScreen.js
│   └── GraduateTalentPortalScreen.js
├── navigation/        # Navigation structure
│   └── RootNavigator.js
├── services/          # API and external services
│   └── apiService.js
├── context/           # Context API for state
│   └── AuthContext.js
├── config/            # Configuration files
│   ├── api.js
│   ├── firebase.js
│   └── flutterwave.js
├── components/        # Reusable components
├── utils/             # Utility functions
└── assets/            # Images and resources
```

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your credentials:
   - Firebase configuration
   - Flutterwave API keys
   - Backend API base URL

3. **Install required packages for features:**
   ```bash
   npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack
   npm install react-native-screens react-native-safe-area-context
   npm install @react-native-async-storage/async-storage
   npm install firebase
   ```

### Running the App

**Development mode:**
```bash
npm start
```

This will open the Expo DevTools. You can then:
- Press `i` to open iOS simulator
- Press `a` to open Android emulator
- Scan QR code with Expo Go app on mobile device

**Build for production:**
```bash
eas build --platform ios
eas build --platform android
```

## Configuration

### Firebase Setup
1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Firestore Database and Authentication
3. Get your configuration credentials
4. Add to `.env` file

### Flutterwave Setup
1. Sign up at [Flutterwave](https://dashboard.flutterwave.com)
2. Get your public and secret keys from dashboard
3. Add to `.env` file

### Backend API Setup
- Set up the Node.js backend server
- Configure MongoDB database
- Update `EXPO_PUBLIC_API_BASE_URL` in `.env`

## Key Features Implementation

### School Search & Discovery
- Location-based queries
- Filtering by school type, fees, ratings
- AI recommendations based on user preferences

### Real-time Chat
- WebSocket or Firebase Realtime DB for live messaging
- Message history and offline support
- Push notifications

### Payment Processing
- Flutterwave SDK integration
- Multiple currency support
- Transaction verification

### Admin Panel
- School listing verification workflow
- User management
- Reporting and analytics

### Offline Support
- AsyncStorage for caching school data
- Background sync for messages
- Service worker for PWA functionality

## API Endpoints

The app expects the following API endpoints:

```
GET    /api/schools              - List schools with filters
GET    /api/schools/:id          - Get school details
GET    /api/schools/search?q=    - Search schools
GET    /api/schools/nearby       - Get nearby schools
POST   /api/auth/login           - User login
POST   /api/auth/signup          - User registration
POST   /api/messages             - Send message
GET    /api/conversations        - Get user conversations
POST   /api/payments             - Process payment
GET    /api/graduates            - List graduates
GET    /api/jobs                 - List job opportunities
```

## TODOs & Future Features

- [ ] Implement real-time notifications
- [ ] Add photo upload functionality
- [ ] Video call integration for consultations
- [ ] Advanced analytics and reporting
- [ ] Multi-language support
- [ ] Dark mode theme
- [ ] Integration with social media authentication
- [ ] Performance optimization and caching strategies

## Deployment

### iOS
```bash
eas build --platform ios --type archive
# Follow Expo's deployment guide for App Store submission
```

### Android
```bash
eas build --platform android --type apk
# Upload to Google Play Store
```

## Support & Troubleshooting

**Common Issues:**
1. **npm install fails** - Clear npm cache: `npm cache clean --force`
2. **Expo not running** - Update Expo CLI: `npm install -g expo-cli@latest`
3. **Firebase connection errors** - Check .env credentials
4. **API errors** - Verify backend server is running

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - See LICENSE file for details

## Contact & Support

For questions or support, please create an issue in the repository.

---

**Last Updated:** April 12, 2026
**Version:** 1.0.0
