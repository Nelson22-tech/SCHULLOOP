import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import apiService from '../../shared/services/apiService';
import { BlueHeader, Btn, C, Card, Chip, Field } from '../../shared/ui/kit';
import { CONTACT_METHODS, SERVICE_CATEGORIES, notify } from './serviceHelpers';

export const ServiceListingFormScreen = ({ navigation, route }) => {
  const editing = route?.params?.service || null;
  const [title, setTitle] = useState(editing?.title || '');
  const [category, setCategory] = useState(editing?.category || '');
  const [description, setDescription] = useState(editing?.description || '');
  const [area, setArea] = useState(editing?.area || '');
  const [city, setCity] = useState(editing?.city || '');
  const [pricing, setPricing] = useState(editing?.pricing || '');
  const [availability, setAvailability] = useState(editing?.availability || '');
  const [contactMethod, setContactMethod] = useState(editing?.contactMethod || CONTACT_METHODS[0]);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const validate = () => {
    const e = {};
    if (title.trim().length < 3) e.title = 'Enter a title (at least 3 characters).';
    if (!category) e.category = 'Choose a category.';
    if (description.trim().length < 10) e.description = 'Describe your service (at least 10 characters).';
    if (!city.trim()) e.city = 'City is required.';
    if (!pricing.trim()) e.pricing = 'Explain how you price or quote.';
    if (!availability.trim()) e.availability = 'Enter your availability.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setBusy(true);
    const body = {
      title: title.trim(), category, description: description.trim(), area: area.trim(),
      city: city.trim(), pricing: pricing.trim(), availability: availability.trim(), contactMethod,
    };
    try {
      if (editing && editing._id) await apiService.request(`/services/${editing._id}`, 'PUT', body);
      else await apiService.request('/services', 'POST', body);
      notify('Saved', editing ? 'Listing updated.' : 'Your listing is now live.');
      navigation.goBack();
    } catch (err) { notify('Listing', err.message); }
    setBusy(false);
  };

  const Err = ({ k }) => (errors[k] ? <Text style={{ color: C.red, fontSize: 12, marginTop: -8, marginBottom: 10 }}>{errors[k]}</Text> : null);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <BlueHeader title={editing ? 'Edit Listing' : 'Offer a Service'} onBack={() => navigation.goBack()} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: 14, paddingBottom: 40 }}>
        <Card>
          <Field label="Title" required value={title} onChangeText={setTitle} placeholder="e.g. Plumber for home repairs" />
          <Err k="title" />
          <Text style={{ fontSize: 12, fontWeight: '700', color: C.text, marginBottom: 8 }}>Category <Text style={{ color: C.red }}>*</Text></Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
            {SERVICE_CATEGORIES.map(c => <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} style={{ marginBottom: 8 }} />)}
          </View>
          <Err k="category" />
          <Field label="Description" required value={description} onChangeText={setDescription} placeholder="What do you offer?" multiline style={{ marginBottom: 14 }} />
          <Err k="description" />
          <Field label="Area" value={area} onChangeText={setArea} placeholder="Neighbourhood or district" />
          <Field label="City" required value={city} onChangeText={setCity} placeholder="City" />
          <Err k="city" />
          <Field label="Pricing / quotation approach" required value={pricing} onChangeText={setPricing} placeholder="e.g. Free quotation after inspection" />
          <Err k="pricing" />
          <Field label="Availability" required value={availability} onChangeText={setAvailability} placeholder="e.g. Mon-Sat, 8am-6pm" />
          <Err k="availability" />
          <Text style={{ fontSize: 12, fontWeight: '700', color: C.text, marginBottom: 8 }}>Contact method</Text>
          <View style={{ flexDirection: 'row', marginBottom: 14 }}>
            {CONTACT_METHODS.map(m => <Chip key={m} label={m} active={contactMethod === m} onPress={() => setContactMethod(m)} />)}
          </View>
          <Btn title={busy ? 'Saving...' : editing ? 'Save changes' : 'Publish listing'} disabled={busy} onPress={save} />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
