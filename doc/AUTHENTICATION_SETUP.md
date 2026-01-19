# Firebase Authentication Setup Guide

This guide will help you set up and test the Firebase Authentication system for the retail management application.

## 🚀 Quick Start

### 1. Firebase Configuration

Make sure your Firebase configuration is properly set up in `src/lib/firebase/config.ts`. You should have:

- Firebase project created
- Authentication enabled (Email/Password provider)
- Firestore database created
- Security rules deployed

### 2. Install Dependencies

The required dependencies should already be installed:

```bash
npm install firebase lucide-react
# or
yarn add firebase lucide-react
```

### 3. Seed Initial Data

Before testing authentication, you need to create sample branches:

1. Visit: `http://localhost:3000/seed`
2. Click "Seed Data" to create sample branches
3. This creates 4 sample branches that users can select during signup

### 4. Test Authentication

Visit: `http://localhost:3000/auth`

## 🔐 Authentication Features

### Login Form (`/auth`)
- Email/password authentication
- Password visibility toggle
- "Remember me" option
- Forgot password functionality
- Form validation and error handling
- Automatic redirect to dashboard on success

### Signup Form (`/auth` - switch to signup)
- Complete employee registration
- Personal information (first name, last name, email, phone)
- Employee NIN (14-digit validation)
- Branch selection (from seeded data)
- Job role selection (multiple roles supported)
- Password confirmation
- Email verification sent automatically
- Business rule validation

### Protected Routes
- Dashboard requires authentication
- Role-based access control
- Automatic redirect to login if not authenticated
- Access denied page for insufficient permissions

### User Management
- Real-time authentication state
- User profile display in dashboard header
- Role badges and permissions
- Logout functionality
- Profile editing (placeholder)

## 🏗️ Architecture

### Components Structure
```
src/components/auth/
├── AuthContainer.tsx      # Main auth wrapper with mode switching
├── LoginForm.tsx         # Login form component
├── SignupForm.tsx        # Signup form component
└── ProtectedRoute.tsx    # Route protection wrapper
```

### Firebase Integration
```
src/lib/firebase/
├── auth.ts              # Authentication service
├── config.ts            # Firebase configuration
├── models.ts            # TypeScript interfaces
├── firestore-service.ts # Database operations
├── business-rules.ts    # Business logic validation
└── seed-data.ts         # Sample data creation
```

## 🧪 Testing Scenarios

### 1. User Registration
1. Go to `/auth` and click "Sign up here"
2. Fill out the form with valid data:
   - First Name: John
   - Last Name: Doe
   - Email: john.doe@example.com
   - Phone: +256 700 123 456
   - Employee NIN: 12345678901234 (14 digits)
   - Branch: Select any branch
   - Roles: Select one or more roles
   - Password: minimum 6 characters
3. Submit and check for email verification

### 2. User Login
1. Go to `/auth`
2. Enter registered email and password
3. Should redirect to dashboard with user info displayed

### 3. Password Reset
1. Go to `/auth`
2. Enter email and click "Forgot password?"
3. Check email for reset link

### 4. Protected Route Access
1. Try accessing `/` without authentication
2. Should redirect to login
3. After login, should access dashboard

### 5. Role-Based Access
1. Login with different role combinations
2. Check user menu for role badges
3. Test permissions (future feature)

## 🔧 Configuration

### Available Job Roles
- **Stock Manager**: Manages inventory and stock levels
- **Receiver**: Receives and processes incoming goods  
- **Supervisor**: Supervises daily operations
- **Accountant**: Handles all accounting and financial operations

### Sample Branches
- **Kyengera Branch**: Kyengera Town (Default)
- **Main Branch**: Kampala Central
- **Ntinda Branch**: Ntinda Shopping Center
- **Entebbe Branch**: Entebbe Road
- **Jinja Branch**: Jinja Main Street

## 🛡️ Security Features

### Client-Side Validation
- Form field validation
- Password strength requirements
- Email format validation
- NIN format validation (14 digits)
- Required field checks

### Server-Side Security
- Firebase Auth integration
- Firestore security rules
- Business rule validation
- Audit logging
- Role-based permissions

### Data Protection
- Email verification required
- Secure password handling
- User session management
- Automatic logout on token expiry

## 🚨 Troubleshooting

### Common Issues

1. **"Cannot find module 'lucide-react'"**
   - Run: `npm install lucide-react`

2. **Firebase configuration errors**
   - Check `src/lib/firebase/config.ts`
   - Ensure all Firebase services are enabled

3. **No branches available during signup**
   - Visit `/seed` to create sample branches
   - Check Firestore for branch documents

4. **Authentication state not persisting**
   - Check Firebase Auth configuration
   - Verify browser localStorage is enabled

5. **Email verification not working**
   - Check Firebase Auth email templates
   - Verify email provider settings

### Debug Mode
Enable debug logging by adding to your Firebase config:
```typescript
// In config.ts
if (typeof window !== 'undefined') {
  window.localStorage.setItem('debug', 'firebase:*');
}
```

## 📱 Mobile Responsiveness

The authentication forms are fully responsive:
- Mobile-first design
- Touch-friendly inputs
- Responsive grid layouts
- Optimized for all screen sizes

## 🔄 Next Steps

After authentication is working:

1. **Profile Management**: Implement user profile editing
2. **Role Management**: Add admin role management interface
3. **Password Policies**: Implement stronger password requirements
4. **Multi-Factor Auth**: Add 2FA support
5. **Social Login**: Add Google/Facebook authentication
6. **Session Management**: Implement session timeout controls

## 📞 Support

For issues or questions:
1. Check the browser console for errors
2. Verify Firebase configuration
3. Test with different browsers
4. Check network connectivity

The authentication system is now fully integrated with your retail management dashboard and ready for production use! 