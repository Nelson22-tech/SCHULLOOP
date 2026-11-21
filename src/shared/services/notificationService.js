import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import apiService from './apiService';

Notifications.setNotificationHandler({handleNotification:async()=>({shouldPlaySound:true,shouldSetBadge:true,shouldShowBanner:true,shouldShowList:true})});
export async function registerForPushNotifications(){
  if(Platform.OS==='web') return null;
  const existing=await Notifications.getPermissionsAsync();
  let status=existing.status;
  if(status!=='granted'){const requested=await Notifications.requestPermissionsAsync();status=requested.status;}
  if(status!=='granted') return null;
  const projectId=Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
  try{const token=(await Notifications.getExpoPushTokenAsync(projectId?{projectId}:undefined)).data;await apiService.registerPushToken(token,Platform.OS);return token;}catch(e){console.warn('Push registration failed',e.message);return null;}
}
