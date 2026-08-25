import React, { useState } from 'react';
import { X, User, Mail, Phone, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { collection, query, getDocs, setDoc, where, doc } from 'backend/database';
import { db } from '../backend/config';

// Backend Auth REST API endpoint for creating users without signing out the current admin
const AUTH_BASE_URL = 'https://identitytoolkit.googleapis.com/v1/accounts';

const AddCaregiverModal = ({ isOpen, onClose, institutionId, createdBy, onCaregiverCreated }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    countryCode: '+1',
    phoneNumber: '',
    phone: '',
    password: '',
    role: 'caregiver' // caregiver, nurse, doctor
  });
  
  const [errors, setErrors] = useState({});

  const roles = [
    { value: 'caregiver', label: 'Caregiver' },
    { value: 'nurse', label: 'Nurse' },
    { value: 'doctor', label: 'Doctor' },
    { value: 'pharmacist', label: 'Pharmacist' }
  ];

  const validate = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (!formData.phoneNumber.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    if (!institutionId) {
      toast.error('Institution ID is required. Please ensure you are logged in to an institution.');
      return;
    }

    setLoading(true);
    try {
      const name = formData.name.trim();
      const email = formData.email.trim().toLowerCase();
      const phone = `${formData.countryCode}${formData.phoneNumber.trim()}`;
      const password = formData.password;
      const role = formData.role;

      // 1. Check if email already exists in Database
      const usersRef = collection(db, 'users');
      const emailQuery = query(usersRef, where('email', '==', email));
      const emailSnapshot = await getDocs(emailQuery);
      if (!emailSnapshot.empty) {
        setErrors(prev => ({
          ...prev,
          email: 'This email is already registered. Please use a different email or check if the user already exists in your staff list.'
        }));
        toast.error(
          <>
            <div className="font-bold">Email Already In Use</div>
            <div className="text-sm mt-1">
              The email "{email}" is already registered in the system.
              If this person should have access, check your existing staff list.
            </div>
          </>,
          { autoClose: 6000 }
        );
        return;
      }

      // 2. Create Backend Auth user via REST API (does NOT sign out current admin)
      const backendApiKey = process.env.REACT_APP_BACKEND_API_KEY || '';
      const authResponse = await fetch(`${AUTH_BASE_URL}:signUp?key=${backendApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true })
      });
      const authData = await authResponse.json();

      if (!authResponse.ok || authData.error) {
        const msg = authData.error?.message || 'Backend auth creation failed';
        if (msg.includes('EMAIL_EXISTS')) {
          setErrors(prev => ({ ...prev, email: 'Email already exists in Backend Auth.' }));
          toast.error('Email already exists. Please use a different email.');
          return;
        }
        throw new Error(msg);
      }

      const caregiverId = authData.localId;
      if (!caregiverId) {
        throw new Error('No user ID returned from Backend Auth');
      }

      // 3. Write user profile to Database with all required fields
      const userProfile = {
        // Identity
        uid: caregiverId,
        email,
        name,
        displayName: name,
        phone: phone || '',

        // Role fields (all formats for compatibility)
        userType: role,
        type: role,
        role,
        roles: [role],

        // Institution
        institutionId,

        // Status
        status: 'pending',
        isActive: true,
        active: true,

        // Onboarding
        onboardingComplete: false,
        profileComplete: false,
        accountType: 'institution_created',

        // Payment defaults
        paymentType: 'hourly',
        hourlyRate: 0,
        monthlyRate: 0,
        rateType: 'per_hour',
        currency: 'USD',

        // Timestamps
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: createdBy || 'admin'
      };

      await setDoc(doc(db, 'users', caregiverId), userProfile);
      await setDoc(doc(db, 'caregivers', caregiverId), userProfile, { merge: true });

      // 4. Success
      const roleLabel = roles.find(r => r.value === role)?.label || 'Staff';
      toast.success(
        <>
          <div className="font-bold mb-2">{roleLabel} Account Created Successfully!</div>
          <div className="text-sm">
            <div>Email: <strong>{email}</strong></div>
            <div className="mt-2 text-xs opacity-80">
              Account created successfully. User can log in with their email and password.
            </div>
          </div>
        </>,
        { autoClose: 8000, position: 'top-center' }
      );

      // Reset form
      setFormData({
        name: '',
        email: '',
        countryCode: '+1',
        phoneNumber: '',
        phone: '',
        password: '',
        role: 'caregiver'
      });
      setErrors({});

      // Notify parent
      if (onCaregiverCreated) {
        onCaregiverCreated({ id: caregiverId, ...userProfile });
      }

      onClose();
    } catch (error) {
      console.error('Error creating caregiver:', error);
      toast.error(error.message || 'Failed to create caregiver account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[95vh] my-4 flex flex-col">
        {/* Header - Fixed */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-xl shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-white truncate">Add New Staff Member</h2>
            <p className="text-blue-100 text-xs sm:text-sm mt-1 truncate">Create a {roles.find(r => r.value === formData.role)?.label.toLowerCase() || 'staff'} account</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors shrink-0 ml-2"
            disabled={loading}
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        {/* Form - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="inline h-4 w-4 mr-1" />
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="John Doe"
              disabled={loading}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="inline h-4 w-4 mr-1" />
              E-Mail *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="john.doe@example.com"
              disabled={loading}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errors.email}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="inline h-4 w-4 mr-1" />
              Mobile Number *
            </label>
            <div className="flex space-x-2">
              {/* Country Code Dropdown */}
              <select
                value={formData.countryCode}
                onChange={(e) => setFormData({...formData, countryCode: e.target.value})}
                className={`px-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
              >
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+234">🇳🇬 +234</option>
                <option value="+91">🇮🇳 +91</option>
                <option value="+86">🇨🇳 +86</option>
                <option value="+81">🇯🇵 +81</option>
                <option value="+82">🇰🇷 +82</option>
                <option value="+49">🇩🇪 +49</option>
                <option value="+33">🇫🇷 +33</option>
                <option value="+39">🇮🇹 +39</option>
                <option value="+34">🇪🇸 +34</option>
                <option value="+31">🇳🇱 +31</option>
                <option value="+46">🇸🇪 +46</option>
                <option value="+47">🇳🇴 +47</option>
                <option value="+45">🇩🇰 +45</option>
                <option value="+41">🇨🇭 +41</option>
                <option value="+43">🇦🇹 +43</option>
                <option value="+48">🇵🇱 +48</option>
                <option value="+420">🇨🇿 +420</option>
                <option value="+351">🇵🇹 +351</option>
                <option value="+358">🇫🇮 +358</option>
                <option value="+354">🇮🇸 +354</option>
                <option value="+353">🇮🇪 +353</option>
                <option value="+352">🇱🇺 +352</option>
                <option value="+32">🇧🇪 +32</option>
                <option value="+27">🇿🇦 +27</option>
                <option value="+254">🇰🇪 +254</option>
                <option value="+255">🇹🇿 +255</option>
                <option value="+256">🇺🇬 +256</option>
                <option value="+257">🇧🇮 +257</option>
                <option value="+258">🇲🇿 +258</option>
                <option value="+260">🇿🇲 +260</option>
                <option value="+263">🇿🇼 +263</option>
                <option value="+264">🇳🇦 +264</option>
                <option value="+265">🇲🇼 +265</option>
                <option value="+266">🇱🇸 +266</option>
                <option value="+267">🇧🇼 +267</option>
                <option value="+268">🇸🇿 +268</option>
                <option value="+269">🇰🇲 +269</option>
                <option value="+250">🇷🇼 +250</option>
                <option value="+251">🇪🇹 +251</option>
                <option value="+252">🇸🇴 +252</option>
                <option value="+253">🇩🇯 +253</option>
                <option value="+222">🇲🇷 +222</option>
                <option value="+221">🇸🇳 +221</option>
                <option value="+220">🇬🇲 +220</option>
                <option value="+218">🇱🇾 +218</option>
                <option value="+216">🇹🇳 +216</option>
                <option value="+213">🇩🇿 +213</option>
                <option value="+212">🇲🇦 +212</option>
                <option value="+20">🇪🇬 +20</option>
                <option value="+966">🇸🇦 +966</option>
                <option value="+971">🇦🇪 +971</option>
                <option value="+968">🇴🇲 +968</option>
                <option value="+973">🇧🇭 +973</option>
                <option value="+974">🇶🇦 +974</option>
                <option value="+965">🇰🇼 +965</option>
                <option value="+962">🇯🇴 +962</option>
                <option value="+961">🇱🇧 +961</option>
                <option value="+963">🇸🇾 +963</option>
                <option value="+964">🇮🇶 +964</option>
                <option value="+972">🇮🇱 +972</option>
                <option value="+970">🇵🇸 +970</option>
                <option value="+98">🇮🇷 +98</option>
                <option value="+93">🇦🇫 +93</option>
                <option value="+92">🇵🇰 +92</option>
                <option value="+94">🇱🇰 +94</option>
                <option value="+95">🇲🇲 +95</option>
                <option value="+880">🇧🇩 +880</option>
                <option value="+977">🇳🇵 +977</option>
                <option value="+975">🇧🇹 +975</option>
                <option value="+855">🇰🇭 +855</option>
                <option value="+856">🇱🇦 +856</option>
                <option value="+84">🇻🇳 +84</option>
                <option value="+62">🇮🇩 +62</option>
                <option value="+65">🇸🇬 +65</option>
                <option value="+60">🇲🇾 +60</option>
                <option value="+63">🇵🇭 +63</option>
                <option value="+672">🇦🇺 +672</option>
                <option value="+64">🇳🇿 +64</option>
                <option value="+61">🇦🇺 +61</option>
                <option value="+7">🇷🇺 +7</option>
                <option value="+995">🇬🇪 +995</option>
                <option value="+994">🇦🇿 +994</option>
                <option value="+993">🇹🇯 +993</option>
                <option value="+992">🇹🇯 +992</option>
                <option value="+374">🇦🇲 +374</option>
                <option value="+373">🇲🇩 +373</option>
                <option value="+380">🇺🇦 +380</option>
                <option value="+381">🇷🇸 +381</option>
                <option value="+382">🇲🇪 +382</option>
                <option value="+383">🇧🇦 +383</option>
                <option value="+385">🇭🇷 +385</option>
                <option value="+386">🇸🇮 +386</option>
                <option value="+387">🇧🇦 +387</option>
                <option value="+389">🇲🇰 +389</option>
                <option value="+370">🇱🇹 +370</option>
                <option value="+371">🇱🇻 +371</option>
                <option value="+372">🇪🇪 +372</option>
                <option value="+36">🇭🇺 +36</option>
                <option value="+359">🇧🇬 +359</option>
                <option value="+357">🇨🇾 +357</option>
                <option value="+40">🇷🇴 +40</option>
                <option value="+90">🇹🇷 +90</option>
                <option value="+225">🇨🇮 +225</option>
                <option value="+224">🇬🇳 +224</option>
                <option value="+226">🇧🇫 +226</option>
                <option value="+229">🇧🇯 +229</option>
                <option value="+242">🇨🇬 +242</option>
                <option value="+243">🇨🇩 +243</option>
                <option value="+245">🇬🇼 +245</option>
                <option value="+241">🇬🇦 +241</option>
                <option value="+240">🇬🇶 +240</option>
                <option value="+239">🇸🇹 +239</option>
                <option value="+238">🇨🇻 +238</option>
                <option value="+237">🇨🇲 +237</option>
                <option value="+236">🇨🇫 +236</option>
                <option value="+235">🇹🇩 +235</option>
                <option value="+233">🇬🇭 +233</option>
                <option value="+232">🇸🇱 +232</option>
                <option value="+231">🇱🇷 +231</option>
                <option value="+230">🇲🇺 +230</option>
                <option value="+229">🇧🇯 +229</option>
                <option value="+228">🇹🇬 +228</option>
                <option value="+227">🇳🇪 +227</option>
                <option value="+226">🇧🇫 +226</option>
                <option value="+225">🇨🇮 +225</option>
                <option value="+224">🇬🇳 +224</option>
                <option value="+223">🇧🇫 +223</option>
                <option value="+222">🇲🇷 +222</option>
                <option value="+221">🇸🇳 +221</option>
                <option value="+220">🇬🇲 +220</option>
              </select>
              
              {/* Phone Number Input */}
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="555-123-4567"
                disabled={loading}
              />
            </div>
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errors.phone}
              </p>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role/Type *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading}
            >
              {roles.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Lock className="inline h-4 w-4 mr-1" />
              Password *
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Min. 6 characters"
              disabled={loading}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errors.password}
              </p>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 shrink-0 mr-3 mt-0.5 text-blue-600" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">What happens next?</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>{roles.find(r => r.value === formData.role)?.label || 'Staff'} account will be created</li>
                  <li>They will complete onboarding on first login</li>
                  <li>They cannot access dashboard until onboarding is complete</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions - Fixed at bottom */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-gray-200 mt-6 sticky bottom-0 bg-white -mx-4 sm:-mx-6 px-4 sm:px-6 pb-4 sm:pb-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <User className="h-4 w-4 mr-2" />
                  Add {roles.find(r => r.value === formData.role)?.label || 'Staff'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCaregiverModal;

