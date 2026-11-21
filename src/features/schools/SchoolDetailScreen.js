// School Detail Screen
import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Card, ErrorMessage, Header, LoadingSpinner, Rating } from '../../shared/components';
import { BlueHeader, Btn, C, IconTile, StatusPill, topPad } from '../../shared/ui/kit';
import apiService from '../../shared/services/apiService';
import { logError } from '../../shared/utils/logger';

const TABS = [['about', 'About'], ['programs', 'Programs'], ['gallery', 'Gallery'], ['reviews', 'Reviews']];

const programLabel = (p) => (typeof p === 'string' ? p : (p && (p.name || p.title)) || '');
const formatFees = (fees) => {
  if (fees === undefined || fees === null || fees === '') return 'Contact school';
  if (typeof fees === 'number') return `$${fees.toLocaleString()} / year`;
  return /^\d+(\.\d+)?$/.test(String(fees)) ? `$${Number(fees).toLocaleString()} / year` : String(fees);
};

export const SchoolDetailScreen = ({ navigation, route }) => {
  const { schoolId } = route.params || {};
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [activeTab, setActiveTab] = useState('about');
  const [favorite, setFavorite] = useState(false);
  const [reviewRating, setReviewRating] = useState('5');
  const [reviewComment, setReviewComment] = useState('');
  const [showClaim, setShowClaim] = useState(false);
  const [claimEvidence, setClaimEvidence] = useState('');
  const [claimSending, setClaimSending] = useState(false);

  const loadSchoolDetail = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiService.getSchoolDetail(schoolId);
      setSchool(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  const loadReviews = useCallback(async () => {
    try {
      const data = await apiService.request(`/schools/${schoolId}/reviews`);
      setReviews(data.reviews || []);
    } catch (err) {
      logError('Error loading reviews:', err);
    }
  }, [schoolId]);

  useEffect(() => {
    if (schoolId) {
      loadSchoolDetail();
      loadReviews();
    }
  }, [schoolId, loadSchoolDetail, loadReviews]);

  const handleContactSchool = () => {
    navigation.navigate('Chat', { schoolId });
  };

  const handleEnrollment = () => {
    Alert.alert('Enrollment', 'Proceed with enrollment for this school?', [
      { text: 'Cancel', onPress: () => {}, style: 'cancel' },
      { text: 'Proceed', onPress: () => navigation.navigate('Payment', { schoolId }) },
    ]);
  };

  const handleFavorite = async () => {
    try {
      if (favorite) {
        await apiService.removeFavorite(schoolId);
      } else {
        await apiService.addFavorite(schoolId);
      }
      setFavorite((previous) => !previous);
    } catch (err) {
      Alert.alert('Favorites', err.message);
    }
  };

  const submitClaim = async () => {
    setClaimSending(true);
    try {
      await apiService.claimSchool(schoolId, { evidence: claimEvidence.trim() });
      setShowClaim(false);
      setClaimEvidence('');
      Alert.alert('Claim submitted', 'An administrator will review your claim. You will be notified of the result.');
    } catch (err) {
      Alert.alert('Claim', err.message);
    } finally {
      setClaimSending(false);
    }
  };

  const submitReview = async () => {
    try {
      await apiService.addSchoolReview(schoolId, Number(reviewRating), reviewComment);
      setReviewComment('');
      await loadReviews();
      Alert.alert('Review', 'Your review was submitted');
    } catch (err) {
      Alert.alert('Review', err.message);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading school details..." />;
  }

  if (error) {
    return (
      <View style={styles.container}>
        <BlueHeader title="School Details" onBack={() => navigation.goBack()} />
        <ErrorMessage message={error} onRetry={loadSchoolDetail} />
      </View>
    );
  }

  if (!school) {
    return (
      <View style={styles.container}>
        <BlueHeader title="School Details" onBack={() => navigation.goBack()} />
        <Text style={styles.emptyText}>School not found</Text>
      </View>
    );
  }

  if (school.locked) {
    const claimed = school.verificationStatus === 'claimed';
    return (
      <View style={styles.container}>
        <BlueHeader title={school.name} onBack={() => navigation.goBack()} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.infoSection}>
            <Text style={styles.schoolName}>{school.name}</Text>
            <Text style={styles.location}>{school.location || 'Location not listed'}</Text>
            <View style={[styles.badgeRow, styles.lockedBadges]}>
              <StatusPill label={school.type || 'School'} tone="blue" />
              <StatusPill label={claimed ? 'Claimed - awaiting verification' : 'Unverified'} tone="amber" />
            </View>
          </View>

          <Card style={styles.lockedCard}>
            <Ionicons name="lock-closed" size={28} color={C.blue} style={{ marginBottom: 8 }} />
            <Text style={styles.sectionTitle}>Full profile locked</Text>
            <Text style={styles.description}>
              This school has not been verified yet, so fees, admission requirements, photos, reviews,
              programs and contact details are hidden to protect you from unconfirmed information.
            </Text>
            <View style={styles.lockedList}>
              <Text style={styles.lockedItem}>• Country: {school.country || 'N/A'}</Text>
              <Text style={styles.lockedItem}>• Region: {school.region || 'N/A'}</Text>
              <Text style={styles.lockedItem}>• City: {school.city || 'N/A'}</Text>
            </View>
          </Card>

          <View style={styles.actionSection}>
            <Btn
              title={favorite ? 'Saved - we will notify you' : 'Save & notify me when verified'}
              onPress={handleFavorite}
              variant="outline"
            />
            {!claimed && !showClaim && (
              <Btn title="I represent this school - Claim it" onPress={() => setShowClaim(true)} />
            )}
            {showClaim && (
              <Card style={styles.reviewForm}>
                <Text style={styles.sectionTitle}>Claim this school</Text>
                <Text style={styles.description}>
                  Tell us your role and how we can confirm it (official email, school website, registration number).
                </Text>
                <TextInput
                  style={[styles.reviewInput, styles.reviewCommentInput]}
                  value={claimEvidence}
                  onChangeText={setClaimEvidence}
                  placeholder="e.g. I am the Head Teacher. Official email: head@school.edu"
                  multiline
                />
                <Btn
                  title={claimSending ? 'Submitting...' : 'Submit claim'}
                  onPress={submitClaim}
                  disabled={claimSending || claimEvidence.trim().length < 10}
                />
              </Card>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  const programs = (Array.isArray(school.programs) ? school.programs : []).map(programLabel).filter(Boolean);
  const gallery = [school.imageUrl, ...(Array.isArray(school.images) ? school.images : []), ...(Array.isArray(school.gallery) ? school.gallery : [])]
    .map((g) => (typeof g === 'string' ? g : g && g.url))
    .filter(Boolean);
  const ratingValue = Number(school.rating) || 0;
  const levelText = school.educationLevel || school.levels || school.type || 'Not listed';

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Hero */}
        <View style={styles.hero}>
          {school.imageUrl ? (
            <Image source={{ uri: school.imageUrl }} style={styles.headerImage} />
          ) : (
            <View style={[styles.headerImage, styles.heroPlaceholder]}>
              <Ionicons name="school" size={72} color="#fff" />
            </View>
          )}
          <TouchableOpacity style={[styles.heroBtn, { left: 16 }]} onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.heroBtn, { right: 16 }]} onPress={handleFavorite} hitSlop={8}>
            <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={22} color={favorite ? C.red : C.text} />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <View style={styles.infoSection}>
          <View style={styles.titleRow}>
            <Text style={[styles.schoolName, { flex: 1 }]}>{school.name}</Text>
            {school.verified ? <StatusPill label="Verified" tone="green" /> : null}
          </View>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={16} color={C.orange} />
            <Text style={styles.ratingText}>
              {ratingValue ? ratingValue.toFixed(1) : 'New'}{' '}
              <Text style={styles.reviewCount}>({reviews.length} reviews)</Text>
            </Text>
          </View>

          <View style={styles.infoItem}>
            <IconTile name="location" />
            <View style={styles.infoText}>
              <Text style={styles.label}>Location</Text>
              <Text style={styles.value}>{school.location || 'Not listed'}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <IconTile name="school" />
            <View style={styles.infoText}>
              <Text style={styles.label}>Education Level</Text>
              <Text style={styles.value}>{Array.isArray(levelText) ? levelText.join(', ') : levelText}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <IconTile name="cash" />
            <View style={styles.infoText}>
              <Text style={styles.label}>Tuition Fee</Text>
              <Text style={styles.value}>{formatFees(school.fees)}</Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.tab, activeTab === key && styles.activeTab]}
              onPress={() => setActiveTab(key)}
            >
              <Text style={[styles.tabText, activeTab === key && styles.activeTabText]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'about' && (
          <View style={styles.tabContent}>
            <Text style={styles.description}>{school.description || 'No description available yet.'}</Text>
            <View style={{ marginTop: 14 }}>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Founded</Text>
                <Text style={styles.value}>{school.founded || 'N/A'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Students</Text>
                <Text style={styles.value}>{school.studentCount || 'N/A'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Staff</Text>
                <Text style={styles.value}>{school.staffCount || 'N/A'}</Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'programs' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Programs</Text>
            {programs.length > 0 ? (
              programs.map((name, index) => (
                <View key={`${name}-${index}`} style={styles.facilityItem}>
                  <Ionicons name="book" size={16} color={C.blue} style={{ marginRight: 8 }} />
                  <Text style={styles.facilityText}>{name}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noDataText}>No programs listed</Text>
            )}
            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Facilities</Text>
            {school.facilities && school.facilities.length > 0 ? (
              school.facilities.map((facility, index) => (
                <View key={index} style={styles.facilityItem}>
                  <Ionicons name="checkmark-circle" size={18} color={C.green} style={{ marginRight: 8 }} />
                  <Text style={styles.facilityText}>{facility}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noDataText}>No facilities listed</Text>
            )}
          </View>
        )}

        {activeTab === 'gallery' && (
          <View style={styles.tabContent}>
            {gallery.length > 0 ? (
              <View style={styles.galleryGrid}>
                {gallery.map((uri, index) => (
                  <Image key={`${uri}-${index}`} source={{ uri }} style={styles.galleryImage} />
                ))}
              </View>
            ) : (
              <View style={styles.galleryEmpty}>
                <Ionicons name="images-outline" size={36} color={C.blue} />
                <Text style={styles.noDataText}>No photos yet</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'reviews' && (
          <View style={styles.tabContent}>
            <Card style={styles.reviewForm}>
              <Text style={styles.sectionTitle}>Write a review</Text>
              <TextInput
                style={styles.reviewInput}
                value={reviewRating}
                onChangeText={setReviewRating}
                placeholder="Rating 1-5"
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.reviewInput, styles.reviewCommentInput]}
                value={reviewComment}
                onChangeText={setReviewComment}
                placeholder="Share your experience"
                multiline
              />
              <Btn title="Submit Review" onPress={submitReview} disabled={!reviewComment.trim()} />
            </Card>
            {reviews.length > 0 ? (
              <FlatList
                data={reviews}
                keyExtractor={(item) => item._id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <Card style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <Text style={styles.reviewAuthor}>{item.author}</Text>
                      <Rating value={item.rating} size="small" />
                    </View>
                    <Text style={styles.reviewText}>{item.comment}</Text>
                  </Card>
                )}
              />
            ) : (
              <Card>
                <Text style={styles.noDataText}>No reviews yet</Text>
              </Card>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionSection}>
          <Btn
            title="Apply Now"
            onPress={() => navigation.navigate('AdmissionApplication', { schoolId, schoolName: school.name })}
            style={styles.applyButton}
          />
          <View style={styles.secondaryRow}>
            <Btn title="Contact" icon="chatbubble-ellipses-outline" variant="outline" onPress={handleContactSchool} style={styles.secondaryBtn} />
            <Btn
              title={favorite ? 'Saved' : 'Save'}
              icon={favorite ? 'heart' : 'heart-outline'}
              variant="outline"
              onPress={handleFavorite}
              style={styles.secondaryBtn}
            />
          </View>
          <View style={styles.secondaryRow}>
            <Btn
              title="Groups"
              icon="people-outline"
              variant="outline"
              onPress={() => navigation.navigate('SchoolGroups', { schoolId, schoolName: school.name })}
              style={styles.secondaryBtn}
            />
            <Btn title="Enroll Now" icon="ribbon-outline" variant="outline" onPress={handleEnrollment} style={styles.secondaryBtn} />
          </View>
          {school.isMyClaimedSchool && school.verificationStatus === 'verified' ? (
            <Btn
              title="Create a Group"
              variant="outline"
              onPress={() => navigation.navigate('CreateGroup', { schoolId, schoolName: school.name })}
            />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  hero: { position: 'relative' },
  headerImage: { width: '100%', height: 220, backgroundColor: C.blueLine },
  heroPlaceholder: { backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center' },
  heroBtn: { position: 'absolute', top: topPad - 4, width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 3 },
  infoSection: { padding: 16, backgroundColor: '#fff' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  schoolName: { fontSize: 20, fontWeight: '800', color: C.text },
  location: { fontSize: 14, color: C.muted, marginTop: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 14 },
  ratingText: { marginLeft: 5, fontSize: 14, fontWeight: '700', color: C.text },
  reviewCount: { fontWeight: '500', color: C.muted },
  infoItem: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  infoText: { marginLeft: 12, flex: 1 },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border, paddingHorizontal: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: C.blue },
  tabText: { fontSize: 13, fontWeight: '600', color: C.muted },
  activeTabText: { color: C.blue, fontWeight: '800' },
  tabContent: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 8 },
  description: { fontSize: 14, color: C.muted, lineHeight: 21 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EDF2FA' },
  label: { fontSize: 12, color: C.muted },
  value: { fontSize: 14, fontWeight: '700', color: C.text, marginTop: 1 },
  facilityItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  facilityText: { fontSize: 14, color: C.text, flex: 1 },
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  galleryImage: { width: '48%', height: 110, borderRadius: 12, backgroundColor: C.blueLine },
  galleryEmpty: { alignItems: 'center', paddingVertical: 20 },
  reviewCard: { marginHorizontal: 0, marginVertical: 4 },
  reviewForm: { marginHorizontal: 0, padding: 16, marginBottom: 12 },
  reviewInput: { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, marginBottom: 10, backgroundColor: '#fff', color: C.text },
  reviewCommentInput: { minHeight: 80, textAlignVertical: 'top' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12 },
  reviewAuthor: { fontSize: 14, fontWeight: '700', color: C.text },
  reviewText: { fontSize: 13, color: C.muted, padding: 16, lineHeight: 18 },
  noDataText: { fontSize: 14, color: C.muted, textAlign: 'center', paddingVertical: 12 },
  actionSection: { paddingHorizontal: 16, gap: 12, marginTop: 4 },
  applyButton: { height: 54, borderRadius: 14 },
  secondaryRow: { flexDirection: 'row', gap: 12 },
  secondaryBtn: { flex: 1, paddingVertical: 12 },
  lockedBadges: { marginTop: 12 },
  lockedCard: { margin: 16, padding: 16, alignItems: 'flex-start' },
  lockedList: { marginTop: 12 },
  lockedItem: { fontSize: 14, color: C.text, paddingVertical: 2 },
  emptyText: { fontSize: 16, color: C.muted, textAlign: 'center', marginTop: 40 },
});
