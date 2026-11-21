// Navigation structure for the app
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, Text, View } from 'react-native';
import { useTheme } from '../shared/theme/ThemeContext';

// Screens
import { AdminDashboardScreen } from '../features/admin/AdminDashboardScreen';
import { SchoolAdminPortalScreen } from '../features/schoolAdmin/SchoolAdminPortalScreen';
import { ManageAdminsScreen } from '../features/admin/ManageAdminsScreen';
import { LoginScreen } from '../features/auth/LoginScreen';
import { DemoScreen } from '../features/auth/DemoScreen';
import { SignupScreen } from '../features/auth/SignupScreen';
import { PasswordRecoveryScreen } from '../features/auth/PasswordRecoveryScreen';
import { ChatScreen } from '../features/chat/ChatScreen';
import { GraduateTalentPortalScreen } from '../features/graduates/GraduateTalentPortalScreen';
import { PaymentScreen } from '../features/payments/PaymentScreen';
import { PaymentHistoryScreen } from '../features/payments/PaymentHistoryScreen';
import { NotificationsScreen } from '../features/notifications/NotificationsScreen';
import { HomeScreen } from '../features/schools/HomeScreen';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';
import { StudentProfileScreen } from '../features/profile/StudentProfileScreen';
import { ApplicationConfirmationScreen } from '../features/schools/ApplicationConfirmationScreen';
import { MyApplicationsScreen } from '../features/schools/MyApplicationsScreen';
import { SubscriptionPlansScreen } from '../features/subscriptions/SubscriptionPlansScreen';
import { SchoolDetailScreen } from '../features/schools/SchoolDetailScreen';
import { AdmissionApplicationScreen } from '../features/schools/AdmissionApplicationScreen';
import { SearchFilterScreen } from '../features/schools/SearchFilterScreen';
import { FavoritesScreen } from '../features/schools/FavoritesScreen';
import { GraduateProfileScreen } from '../features/graduates/GraduateProfileScreen';
import { PostJobScreen } from '../features/graduates/PostJobScreen';
import { EmployerJobsScreen } from '../features/graduates/EmployerJobsScreen';
import { EmployerApplicationsScreen } from '../features/graduates/EmployerApplicationsScreen';
import { StudentConnectScreen } from '../features/connect/StudentConnectScreen';
import { PublicProfileScreen } from '../features/connect/PublicProfileScreen';
import { SchoolGroupsScreen } from '../features/groups/SchoolGroupsScreen';
import { CreateGroupScreen } from '../features/groups/CreateGroupScreen';
import { GroupDetailScreen } from '../features/groups/GroupDetailScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { CareerDocumentsScreen } from '../features/graduates/CareerDocumentsScreen';
import { InterviewsScreen } from '../features/graduates/InterviewsScreen';

import { SplashScreen } from '../features/auth/SplashScreen';
import { CommunitiesScreen } from '../features/connect/CommunitiesScreen';
import { CommunityDetailScreen } from '../features/connect/CommunityDetailScreen';
import { GroupChatScreen } from '../features/connect/GroupChatScreen';
import { MessagesScreen } from '../features/chat/MessagesScreen';
import { StudentPortalScreen } from '../features/portal/StudentPortalScreen';
import { ApplicationDetailsScreen } from '../features/schools/ApplicationDetailsScreen';
import { PaymentReceiptScreen } from '../features/payments/PaymentReceiptScreen';
import { StudentDocumentsScreen } from '../features/portal/StudentDocumentsScreen';
import { PaymentsManagementScreen } from '../features/admin/PaymentsManagementScreen';
import { JobSearchScreen } from '../features/jobs/JobSearchScreen';
import { JobListingsScreen } from '../features/jobs/JobListingsScreen';
import { JobDetailsScreen } from '../features/jobs/JobDetailsScreen';
import { ApplyJobScreen } from '../features/jobs/ApplyJobScreen';
import { MyJobApplicationsScreen } from '../features/jobs/MyJobApplicationsScreen';
import { JobApplicationDetailsScreen } from '../features/jobs/JobApplicationDetailsScreen';
import { SavedJobsScreen } from '../features/jobs/SavedJobsScreen';
import { JobMessagesScreen } from '../features/jobs/JobMessagesScreen';
import { JobProfileScreen } from '../features/jobs/JobProfileScreen';
import { ExploreScreen } from '../features/explore/ExploreScreen';
import { ConnectHubScreen } from '../features/connect/ConnectHubScreen';
import { ActivitiesScreen } from '../features/activities/ActivitiesScreen';
import { AccountSecurityScreen } from '../features/profile/AccountSecurityScreen';
import { ProjectDetailScreen } from '../features/freelance/ProjectDetailScreen';
import { PostProjectScreen } from '../features/freelance/PostProjectScreen';
import { FreelancerProfileScreen } from '../features/freelance/FreelancerProfileScreen';
import { MentorsScreen } from '../features/mentors/MentorsScreen';
import { MentorDetailScreen } from '../features/mentors/MentorDetailScreen';
import { MentorSetupScreen } from '../features/mentors/MentorSetupScreen';
import { MyLessonsScreen } from '../features/mentors/MyLessonsScreen';
import { EventsScreen } from '../features/events/EventsScreen';
import { EventDetailScreen } from '../features/events/EventDetailScreen';
import { EventFormScreen } from '../features/events/EventFormScreen';
import { LocalServicesScreen } from '../features/services/LocalServicesScreen';
import { ServiceDetailScreen } from '../features/services/ServiceDetailScreen';
import { ServiceRequestsScreen } from '../features/services/ServiceRequestsScreen';
import { ScholarshipDetailScreen } from '../features/scholarships/ScholarshipDetailScreen';
import { Ionicons } from '@expo/vector-icons';
import { MyJourneyScreen } from '../features/journey/MyJourneyScreen';
import { JourneyEditScreen } from '../features/journey/JourneyEditScreen';
import { CapabilitiesScreen } from '../features/journey/CapabilitiesScreen';
import { ProfilePrivacyScreen } from '../features/journey/ProfilePrivacyScreen';
import { FreelanceScreen } from '../features/freelance/FreelanceScreen';
import { ServiceListingFormScreen } from '../features/services/ServiceListingFormScreen';
import { MyListingsScreen } from '../features/services/MyListingsScreen';
import { ScholarshipsScreen } from '../features/scholarships/ScholarshipsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Stack - Login screens
const AuthStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} options={{ animationEnabled: false }} />
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
        options={{ animationEnabled: false }}
      />
      <Stack.Screen name="Demo" component={DemoScreen} options={{ animationEnabled: true }} />
      <Stack.Screen 
        name="Signup" 
        component={SignupScreen}
      />
      <Stack.Screen
        name="PasswordRecovery"
        component={PasswordRecoveryScreen}
      />
    </Stack.Navigator>
  );
};

// Main Tab Navigator — Home / Explore / Applications / Profile, exactly as in the approved preview
const tabIcon = (name) => ({ color, focused }) => <Ionicons name={focused ? name : `${name}-outline`} size={22} color={color} />;
const MainTabs = ({ user }) => {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0B5FE8',
        tabBarInactiveTintColor: '#6B7A94',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarStyle: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, height: 62, paddingTop: 6, paddingBottom: 8 },
      }}
    >
      <Tab.Screen name="HomeTab" component={DashboardScreen} options={{ tabBarLabel: 'Home', tabBarIcon: tabIcon('home') }} />
      <Tab.Screen name="ExploreTab" component={ExploreScreen} options={{ tabBarLabel: 'Explore', tabBarIcon: tabIcon('compass') }} />
      <Tab.Screen name="ConnectTab" component={ConnectHubScreen} options={{ tabBarLabel: 'Connect', tabBarIcon: tabIcon('people') }} />
      <Tab.Screen name="ActivitiesTab" component={ActivitiesScreen} options={{ tabBarLabel: 'Activities', tabBarIcon: tabIcon('layers') }} />
      <Tab.Screen name="ProfileTab" component={StudentProfileScreen} options={{ tabBarLabel: 'Profile', tabBarIcon: tabIcon('person') }} />
    </Tab.Navigator>
  );
};

// Main App Stack - Wraps tabs and modal screens
const MainStack = ({ user }) => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}
    >
      <Stack.Screen name="MainTabs" options={{ animationEnabled: false }}>
        {() => <MainTabs user={user} />}
      </Stack.Screen>
      {/* Modal screens - appear on top of tabs */}
      <Stack.Group screenOptions={{ presentation: 'card' }}>
        <Stack.Screen name="MyJourney" component={MyJourneyScreen} />
        <Stack.Screen name="JourneyEdit" component={JourneyEditScreen} />
        <Stack.Screen name="Capabilities" component={CapabilitiesScreen} />
        <Stack.Screen name="ProfilePrivacy" component={ProfilePrivacyScreen} />
        <Stack.Screen name="AccountSecurity" component={AccountSecurityScreen} />
        <Stack.Screen name="Freelance" component={FreelanceScreen} />
        <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
        <Stack.Screen name="PostProject" component={PostProjectScreen} />
        <Stack.Screen name="FreelancerProfile" component={FreelancerProfileScreen} />
        <Stack.Screen name="LocalServices" component={LocalServicesScreen} />
        <Stack.Screen name="Events" component={EventsScreen} />
        <Stack.Screen name="EventDetail" component={EventDetailScreen} />
        <Stack.Screen name="EventForm" component={EventFormScreen} />
        <Stack.Screen name="Mentors" component={MentorsScreen} />
        <Stack.Screen name="MentorDetail" component={MentorDetailScreen} />
        <Stack.Screen name="MentorSetup" component={MentorSetupScreen} />
        <Stack.Screen name="MyLessons" component={MyLessonsScreen} />
        <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
        <Stack.Screen name="ServiceListingForm" component={ServiceListingFormScreen} />
        <Stack.Screen name="MyListings" component={MyListingsScreen} />
        <Stack.Screen name="ServiceRequests" component={ServiceRequestsScreen} />
        <Stack.Screen name="Scholarships" component={ScholarshipsScreen} />
        <Stack.Screen name="ScholarshipDetail" component={ScholarshipDetailScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="StudentConnect" component={StudentConnectScreen} />
        <Stack.Screen name="Communities" component={CommunitiesScreen} />
        <Stack.Screen name="CommunityDetail" component={CommunityDetailScreen} />
        <Stack.Screen name="Messages" component={MessagesScreen} />
        <Stack.Screen name="GroupChat" component={GroupChatScreen} />
        <Stack.Screen name="StudentPortal" component={StudentPortalScreen} />
        <Stack.Screen name="ApplicationDetails" component={ApplicationDetailsScreen} />
        <Stack.Screen name="PaymentReceipt" component={PaymentReceiptScreen} />
        <Stack.Screen name="Documents" component={StudentDocumentsScreen} />
        <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
        <Stack.Screen name="SchoolAdminPortal" component={SchoolAdminPortalScreen} />
        <Stack.Screen name="PaymentsManagement" component={PaymentsManagementScreen} />
        <Stack.Screen name="JobPortal" component={GraduateTalentPortalScreen} />
        <Stack.Screen name="JobSearch" component={JobSearchScreen} />
        <Stack.Screen name="JobListings" component={JobListingsScreen} />
        <Stack.Screen name="JobDetails" component={JobDetailsScreen} />
        <Stack.Screen name="ApplyJob" component={ApplyJobScreen} />
        <Stack.Screen name="MyJobApplications" component={MyJobApplicationsScreen} />
        <Stack.Screen name="JobApplicationDetails" component={JobApplicationDetailsScreen} />
        <Stack.Screen name="SavedJobs" component={SavedJobsScreen} />
        <Stack.Screen name="JobMessages" component={JobMessagesScreen} />
        <Stack.Screen name="JobProfile" component={JobProfileScreen} />
        <Stack.Screen name="StudentProfile" component={StudentProfileScreen} options={{ animationEnabled: true }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ animationEnabled: true }} />
        <Stack.Screen name="ApplicationConfirmation" component={ApplicationConfirmationScreen} options={{ animationEnabled: true }} />
        <Stack.Screen name="MyApplications" component={MyApplicationsScreen} />
        <Stack.Screen name="SubscriptionPlans" component={SubscriptionPlansScreen} options={{ animationEnabled: true }} />
        <Stack.Screen 
          name="SchoolDetail" 
          component={SchoolDetailScreen}
          options={{ animationEnabled: true }}
        />
        <Stack.Screen 
          name="SearchFilter" 
          component={SearchFilterScreen}
          options={{ animationEnabled: true }}
        />
        <Stack.Screen
          name="Favorites"
          component={FavoritesScreen}
          options={{ animationEnabled: true }}
        />
        <Stack.Screen
          name="PostJob"
          component={PostJobScreen}
          options={{ animationEnabled: true }}
        />
        <Stack.Screen
          name="EmployerJobs"
          component={EmployerJobsScreen}
          options={{ animationEnabled: true }}
        />
        <Stack.Screen
          name="EmployerApplications"
          component={EmployerApplicationsScreen}
          options={{ animationEnabled: true }}
        />
        <Stack.Screen name="CareerDocuments" component={CareerDocumentsScreen} options={{ animationEnabled: true }} />
        <Stack.Screen name="Interviews" component={InterviewsScreen} options={{ animationEnabled: true }} />
        <Stack.Screen name="PasswordRecovery" component={PasswordRecoveryScreen} options={{ animationEnabled: true }} />
        <Stack.Screen
          name="GraduateProfile"
          component={GraduateProfileScreen}
          options={{ animationEnabled: true }}
        />
        <Stack.Screen 
          name="Payment" 
          component={PaymentScreen}
          options={{ animationEnabled: true }}
        />
        <Stack.Screen
          name="AdmissionApplication"
          component={AdmissionApplicationScreen}
          options={{ animationEnabled: true }}
        />
        <Stack.Screen
          name="PaymentHistory"
          component={PaymentHistoryScreen}
          options={{ animationEnabled: true }}
        />
        <Stack.Screen 
          name="Chat" 
          component={ChatScreen}
          options={{ animationEnabled: true }}
        />
        <Stack.Screen
          name="PublicProfile"
          component={PublicProfileScreen}
          options={{ animationEnabled: true }}
        />
        <Stack.Screen
          name="SchoolGroups"
          component={SchoolGroupsScreen}
          options={{ animationEnabled: true }}
        />
        <Stack.Screen
          name="CreateGroup"
          component={CreateGroupScreen}
          options={{ animationEnabled: true }}
        />
        <Stack.Screen
          name="GroupDetail"
          component={GroupDetailScreen}
          options={{ animationEnabled: true }}
        />
        <Stack.Screen
          name="ManageAdmins"
          component={ManageAdminsScreen}
          options={{ animationEnabled: true }}
        />
      </Stack.Group>
    </Stack.Navigator>
  );
};

// Root Navigator
export const RootNavigator = ({ isLoading, isSignout, user }) => {
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // DefaultTheme supplies `fonts` (required by React Navigation 7, ignored by 6) so the tab bar can read fonts.medium.
  const { colors, resolved } = useTheme();
  return (
    <NavigationContainer theme={{ ...DefaultTheme, dark: resolved === 'dark', colors: { ...DefaultTheme.colors, primary: colors.primary, background: colors.background, card: colors.surface, text: colors.text, border: colors.border, notification: colors.primary } }}>
      {isSignout || !user ? <AuthStack /> : <MainStack user={user} />}
    </NavigationContainer>
  );
};
