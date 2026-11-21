import { useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import apiService from '../../shared/services/apiService';
import { AuthContext } from '../auth/AuthContext';
import { C, Card, StatusPill, WhiteHeader } from '../../shared/ui/kit';

const FALLBACK_PLANS = [
  { key: 'student_premium', name: 'Student Premium', amount: 4.99, currency: 'USD', period: 'month', desc: 'For learners ready to stand out', features: ['Enhanced student profile', 'More career connections', 'Priority opportunity alerts'] },
  { key: 'school_professional', name: 'School Professional', amount: 19.99, currency: 'USD', period: 'month', desc: 'For growing education providers', features: ['Enhanced school listing', 'Application management tools', 'School profile analytics'] },
  { key: 'school_premium', name: 'School Premium', amount: 49.99, currency: 'USD', period: 'month', desc: 'For institutions building global reach', features: ['Featured school placement', 'Advanced listing options', 'Expanded visibility'] },
  { key: 'employer_pro', name: 'Employer Pro', amount: 49.99, currency: 'USD', period: 'month', desc: 'For teams hiring global talent', features: ['Enhanced job visibility', 'Candidate management tools', 'Priority hiring alerts'] },
];

const TABS = ['Student', 'School', 'Employer'];
// Free tier shown first in every group (no checkout needed).
const FREE_PLANS = {
  Student: { name: 'Basic', desc: 'Essential features for all students.' },
  School: { name: 'Basic', desc: 'Basic school profile and listing.' },
  Employer: { name: 'Basic', desc: 'Post jobs and review applicants.' },
};
const audienceOf = (plan) => {
  if (Array.isArray(plan.audience) && plan.audience.length) {
    if (plan.audience.includes('school')) return 'School';
    if (plan.audience.includes('employer')) return 'Employer';
    return 'Student';
  }
  const key = String(plan.key || '');
  return key.startsWith('school_') ? 'School' : key.startsWith('employer_') ? 'Employer' : 'Student';
};
const formatPrice = (plan) => {
  const price = Number(plan.amount ?? plan.price ?? 0);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: plan.currency || 'USD' }).format(price) + '/month';
};

export const SubscriptionPlansScreen = ({ navigation }) => {
  const auth = useContext(AuthContext) || {};
  const accountType = auth.user?.userType || 'student';
  const ownTab = accountType === 'school' ? 'School' : accountType === 'employer' ? 'Employer' : 'Student';
  const [tab, setTab] = useState(ownTab);
  const [plans, setPlans] = useState(FALLBACK_PLANS);
  const [active, setActive] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyPlan, setBusyPlan] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [planResult, subscriptionResult] = await Promise.all([apiService.getSubscriptionPlans(), apiService.getMySubscriptions()]);
      if (Array.isArray(planResult.plans) && planResult.plans.length) {
        setPlans(planResult.plans.map((p) => ({ ...p, desc: p.description || 'Tools to help you grow with SchulLoop', features: p.features || [] })));
      }
      setActive(subscriptionResult.active || null);
      setHistory(subscriptionResult.subscriptions || []);
    } catch (error) {
      // The plan cards remain viewable offline; account-specific subscription status is not fabricated.
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const choosePlan = async (plan) => {
    setBusyPlan(plan.key);
    try {
      const redirectUrl = Linking.createURL('subscription-payment');
      const checkout = await apiService.startSubscriptionCheckout(plan.key, redirectUrl);
      if (!checkout.checkoutUrl) throw new Error('The payment provider did not return a secure checkout link.');
      const result = await WebBrowser.openAuthSessionAsync(checkout.checkoutUrl, redirectUrl);
      const returnedUrl = result.url || '';
      const parsed = returnedUrl ? Linking.parse(returnedUrl) : null;
      const query = parsed?.queryParams || {};
      const transactionId = query.transaction_id || query.transactionId;
      const returnedStatus = query.status;
      if (transactionId) {
        const verification = await apiService.verifySubscriptionPayment(transactionId);
        if (verification.verified) {
          Alert.alert('Subscription activated', `${verification.subscription.planName} is active until ${new Date(verification.subscription.endsAt).toLocaleDateString()}. Renewal is manual.`);
          await refresh();
        } else {
          Alert.alert('Payment not verified', verification.message || 'Your plan was not activated.');
        }
      } else if (result.type === 'success' && returnedStatus === 'successful') {
        Alert.alert('Payment awaiting verification', 'The payment returned successfully, but the provider transaction ID was not included. Your plan will not activate until verification succeeds. Contact support with your transaction reference if needed.');
      } else if (result.type === 'cancel') {
        Alert.alert('Checkout cancelled', 'No subscription was activated. You can try again whenever you are ready.');
      } else {
        Alert.alert('Checkout opened', 'Complete the payment in the secure provider page. Your subscription remains pending until the payment is verified. Reopen this page after checkout to refresh status.');
      }
    } catch (error) {
      Alert.alert('Unable to start checkout', error.message || 'Check your internet connection and payment configuration.');
    } finally { setBusyPlan(''); }
  };

  const tabPlans = plans.filter((p) => audienceOf(p) === tab);
  const isCurrent = (plan) => !!active && (active.planKey === plan.key || active.planName === plan.name);
  const activeInTab = tabPlans.some(isCurrent);
  const freeIsCurrent = tab === ownTab && !activeInTab && !(active && !tabPlans.length);
  const free = FREE_PLANS[tab];

  const PlanRow = ({ name, desc, price, current, onUpgrade, busy, last }) => (
    <View style={[s.planRow, !last && s.planBorder]}>
      <View style={{ flex: 1, paddingRight: 10 }}>
        <Text style={s.planName}>{name}</Text>
        <Text style={s.planDesc}>{desc}</Text>
        <Text style={s.planPrice}>{price}</Text>
      </View>
      {current ? <StatusPill label="Current Plan" tone="green" />
        : onUpgrade ? (
          <TouchableOpacity style={[s.upgrade, busy && { opacity: 0.55 }]} disabled={!!busyPlan || loading} onPress={onUpgrade}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.upgradeText}>Upgrade</Text>}
          </TouchableOpacity>
        ) : null}
    </View>
  );

  return (
    <View style={s.screen}>
      <WhiteHeader title="Subscription Plans" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.tabs}>
          {TABS.map((t) => (
            <TouchableOpacity key={t} onPress={() => setTab(t)} style={[s.tab, tab === t && s.tabOn]}>
              <Text style={[s.tabText, tab === t && { color: '#fff' }]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {active && <Card style={s.activeCard}>
          <Text style={s.activeTitle}>Your active plan</Text>
          <Text style={s.activeName}>{active.planName}</Text>
          <Text style={s.activeMeta}>Active until {new Date(active.endsAt).toLocaleDateString()} · Manual renewal</Text>
        </Card>}
        {loading && <View style={s.loading}><ActivityIndicator color={C.blue} /><Text style={s.loadingText}>Loading plan and account status…</Text></View>}

        <Text style={s.group}>{tab} Plans</Text>
        <Card style={s.listCard}>
          <PlanRow name={free.name} desc={free.desc} price="Free" current={freeIsCurrent} last={!tabPlans.length} />
          {tabPlans.map((plan, i) => (
            <PlanRow
              key={plan.key || plan.name}
              name={plan.name}
              desc={plan.desc}
              price={formatPrice(plan)}
              current={isCurrent(plan)}
              onUpgrade={() => choosePlan(plan)}
              busy={busyPlan === plan.key}
              last={i === tabPlans.length - 1}
            />
          ))}
        </Card>
        {!loading && !tabPlans.length && <Text style={s.empty}>Paid plans for {tab.toLowerCase()} accounts are not listed yet.</Text>}

        {!!history.length && <Card><Text style={s.historyTitle}>Subscription history</Text>{history.slice(0, 5).map((item) => (
          <View key={item._id} style={s.historyRow}>
            <View style={{ flex: 1 }}><Text style={s.historyName}>{item.planName}</Text><Text style={s.historyDate}>{new Date(item.createdAt).toLocaleDateString()}</Text></View>
            <StatusPill label={item.status} tone={item.status === 'active' ? 'green' : 'gray'} />
          </View>
        ))}</Card>}
        <Text style={s.disclaimer}>Subscriptions are paid through secure Flutterwave checkout. Plans activate only after the backend verifies the provider transaction. Renewals are manual; no automatic charge is made.</Text>
        <TouchableOpacity style={s.refresh} onPress={refresh}><Text style={s.refreshText}>Refresh subscription status</Text></TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 35 },
  tabs: { flexDirection: 'row', marginHorizontal: 16, marginTop: 14, marginBottom: 6, backgroundColor: C.blueSoft, borderRadius: 12, padding: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9 },
  tabOn: { backgroundColor: C.blue },
  tabText: { color: C.blue, fontWeight: '800', fontSize: 13 },
  group: { fontSize: 16, fontWeight: '800', color: C.text, marginHorizontal: 16, marginTop: 14, marginBottom: 10 },
  listCard: { paddingVertical: 4 },
  planRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  planBorder: { borderBottomWidth: 1, borderBottomColor: '#EDF2FA' },
  planName: { fontSize: 15, fontWeight: '800', color: C.text },
  planDesc: { fontSize: 12, color: C.muted, marginTop: 3, lineHeight: 17 },
  planPrice: { fontSize: 14, fontWeight: '800', color: C.text, marginTop: 6 },
  upgrade: { backgroundColor: C.blue, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9, minWidth: 82, alignItems: 'center' },
  upgradeText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  empty: { color: C.muted, fontSize: 12, marginHorizontal: 16, marginBottom: 12 },
  activeCard: { backgroundColor: C.greenSoft, borderColor: '#B7E6C9', marginTop: 12 },
  activeTitle: { color: '#187548', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  activeName: { color: C.text, fontSize: 17, fontWeight: '900', marginTop: 5 },
  activeMeta: { color: '#3E6D55', fontSize: 12, marginTop: 4 },
  loading: { flexDirection: 'row', gap: 9, alignItems: 'center', marginHorizontal: 16, marginTop: 10 },
  loadingText: { color: C.muted, fontSize: 12 },
  historyTitle: { color: C.text, fontWeight: '900', fontSize: 16, marginBottom: 6 },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#EDF2F8' },
  historyName: { color: C.text, fontWeight: '700', fontSize: 13 },
  historyDate: { color: C.muted, fontSize: 11, marginTop: 3 },
  disclaimer: { fontSize: 11, color: C.muted, lineHeight: 17, marginTop: 6, marginHorizontal: 16 },
  refresh: { alignItems: 'center', padding: 14 },
  refreshText: { color: C.blue, fontWeight: '800', fontSize: 12 },
});
