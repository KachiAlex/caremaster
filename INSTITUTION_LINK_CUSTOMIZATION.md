# Institution Link Customization Feature

## Overview
The institution link customization feature allows institution administrators to create custom, branded URLs for their portals instead of using the default institution ID-based links.

## Features

### 1. **Custom URL Slug**
Create memorable, branded URLs using custom slugs:
- **Format**: `Care Master.com/institution/your-company`
- **Benefits**: 
  - Professional appearance
  - Easy to remember and share
  - SEO-friendly
  - No technical setup required

**Example:**
```
Before: https://elderx-f5c2b.web.app/institution/login?institution=YlRg0VHMK9BrvPQuYXqm
After:  https://elderx-f5c2b.web.app/institution/bulah-healthcare
```

### 2. **Custom Domain** (Premium Feature)
Use your own domain name for complete branding:
- **Format**: `your-company.com` or `health.your-company.com`
- **Benefits**:
  - Full brand control
  - Professional credibility
  - White-label experience
  - SSL automatically provisioned

**Example:**
```
https://bulah.com
https://health.bulah.com
https://portal.bulah.com
```

## How to Use

### For Institution Administrators:

1. **Access the Feature**:
   - Log into your institution admin dashboard
   - Navigate to the "Management" section
   - Click on "Customize Links" button

2. **Set Custom Slug**:
   - Enter your desired slug (e.g., "bulah-healthcare")
   - Slug requirements:
     - 3-30 characters
     - Lowercase letters, numbers, and hyphens only
     - Must be unique across all institutions
     - Cannot use reserved words (admin, api, login, etc.)
   - Preview your new URLs
   - Click "Save Changes"

3. **Set Custom Domain** (Premium):
   - Enter your domain name (e.g., "portal.bulah.com")
   - Contact support for DNS configuration
   - Domain verification required
   - SSL certificate auto-provisioned

### Portal URLs Structure

Once customized, your institution will have clean URLs for all portals:

**With Custom Slug:**
- Landing: `/institution/{slug}`
- Admin: `/institution/{slug}/admin`
- Caregiver: `/institution/{slug}/caregiver`
- Pharmacist: `/institution/{slug}/pharmacist`

**With Custom Domain:**
- Landing: `https://{domain}`
- Admin: `https://{domain}/admin`
- Caregiver: `https://{domain}/caregiver`
- Pharmacist: `https://{domain}/pharmacist`

## Technical Implementation

### Files Created/Modified

1. **`src/components/InstitutionLinkCustomizer.js`**
   - React component for the customization UI
   - Real-time validation
   - URL preview functionality
   - Copy-to-clipboard support

2. **`src/api/institutionAPI.js`**
   - API functions for institution management
   - `updateInstitutionLinks()` - Update custom links
   - `checkSlugAvailability()` - Validate slug uniqueness
   - `generateInstitutionUrls()` - Generate URLs based on customization
   - `getInstitutionBySlug()` - Resolve institution from slug
   - `getInstitutionByDomain()` - Resolve institution from domain

3. **`src/pages/InstitutionAdminDashboard.js`**
   - Integrated link customizer modal
   - Added "Customize Links" button in Management section
   - State management for institution data

### Database Schema

The `institutions` collection now supports two optional fields:

```javascript
{
  id: "YlRg0VHMK9BrvPQuYXqm",
  name: "Bulah Healthcare",
  customSlug: "bulah-healthcare",      // Optional
  customDomain: "portal.bulah.com",     // Optional (Premium)
  updatedAt: Timestamp,
  // ... other fields
}
```

### Validation Rules

**Custom Slug:**
- Format: `/^[a-z0-9-]+$/`
- Min length: 3 characters
- Max length: 30 characters
- Must be unique
- Reserved words blocked

**Custom Domain:**
- Format: Valid domain regex
- Must not include protocol (http/https)
- Requires DNS configuration
- Requires domain verification

## User Experience

### Before Customization:
```
🔗 Share this link with your admin:
https://elderx-f5c2b.web.app/institution/login?institution=YlRg0VHMK9BrvPQuYXqm&role=admin
```
❌ Long, complex, hard to remember

### After Customization (Custom Slug):
```
🔗 Share this link with your admin:
https://elderx-f5c2b.web.app/institution/bulah-healthcare/admin
```
✅ Short, branded, memorable

### After Customization (Custom Domain):
```
🔗 Share this link with your admin:
https://portal.bulah.com/admin
```
✅ Fully branded, professional

## Benefits

### For Institutions:
- **Brand Recognition**: Use your company name in URLs
- **Professionalism**: Clean, memorable links
- **Marketing**: Easier to share and promote
- **Trust**: Custom domains build credibility
- **SEO**: Better search engine visibility

### For Users (Staff/Caregivers/Pharmacists):
- **Easy Access**: Remember simple URLs
- **Quick Login**: Bookmark custom URLs
- **Confidence**: Recognize official links
- **Reduced Errors**: No need to copy long URLs

## Future Enhancements

1. **Automatic DNS Configuration**: Self-service domain setup
2. **Subdomain Support**: Multiple subdomains per institution
3. **Link Analytics**: Track portal access patterns
4. **QR Code Generation**: Quick access via mobile
5. **Vanity URLs**: Custom paths for specific features
6. **API Integration**: Programmatic link management

## Support & Contact

For custom domain setup or any issues with link customization:
- Contact technical support
- Provide your institution ID
- Specify desired domain name
- Allow 24-48 hours for domain verification

## Security Notes

- Custom slugs are publicly resolvable
- Custom domains require proper DNS configuration
- SSL certificates are automatically managed
- Domain ownership must be verified
- All links maintain existing security measures

## Deployment Status

✅ **Live on Production**: December 2024
- Component: InstitutionLinkCustomizer
- API: institutionAPI
- Dashboard Integration: Complete
- Testing: Complete
- Documentation: Complete

---

**Version**: 1.0  
**Last Updated**: December 2024  
**Status**: Production Ready

