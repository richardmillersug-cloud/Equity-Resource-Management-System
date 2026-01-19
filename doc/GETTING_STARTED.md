# Getting Started with Equi Supply Management System

## 🚀 Quick Start Guide

This guide will help you set up and run the Equi Supply Management System locally.

## 📋 Prerequisites

- **Node.js**: 18.0 or higher
- **Yarn**: 1.22.22 or higher (this project uses Yarn, not npm)
- **Git**: For version control
- **Firebase Account**: Required for authentication and database

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd equi
```

### 2. Install Dependencies
```bash
yarn install
```

### 3. Environment Setup
```bash
# Copy the example environment file
cp env.example .env.local

# Edit .env.local with your Firebase configuration
# You can get these values from your Firebase project settings
```

### 4. Firebase Configuration
1. **Create a Firebase Project**: Go to [Firebase Console](https://console.firebase.google.com/)
2. **Enable Authentication**: Enable Email/Password authentication
3. **Create Firestore Database**: Set up Firestore in production mode
4. **Get Configuration**: Copy your Firebase config to `.env.local`

### 5. Deploy Firestore Rules
```bash
yarn deploy-rules
```

### 6. Initialize Database
Visit `http://localhost:3000/seed` after starting the server to initialize sample data.

## 🏃‍♂️ Running the Application

### Development Mode
```bash
yarn dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build
```bash
yarn build:prod
yarn start
```

### Testing
```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Generate coverage report
yarn test:coverage
```

### Linting and Type Checking
```bash
# Check for linting errors
yarn lint

# Fix linting errors
yarn lint:fix

# Type checking
yarn type-check
```

## 🔑 First-Time Setup

### 1. Create Admin Account
```bash
yarn create-hr
```

### 2. Test Database Connection
```bash
yarn test-hr-db
```

### 3. Verify Permissions
```bash
yarn test-hr-permissions
```

### 4. Seed Sample Data
1. Visit `http://localhost:3000/seed`
2. Click "Seed Data" to create sample branches and data
3. This creates test data for all modules

## 🎯 Available Scripts

| Command | Description |
|---------|-------------|
| `yarn dev` | Start development server with Turbopack |
| `yarn build` | Build for production |
| `yarn start` | Start production server |
| `yarn test` | Run tests |
| `yarn test:watch` | Run tests in watch mode |
| `yarn test:coverage` | Generate test coverage report |
| `yarn lint` | Check for linting errors |
| `yarn lint:fix` | Fix linting errors automatically |
| `yarn type-check` | Run TypeScript type checking |
| `yarn deploy` | Deploy to Firebase |
| `yarn deploy:rules` | Deploy only Firestore rules |
| `yarn firebase:emulate` | Start Firebase emulators |
| `yarn clean` | Clean build artifacts |

## 🏗️ Project Structure

```
equi/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── auth/              # Authentication pages
│   │   ├── dashboard/         # Main application dashboards
│   │   └── layout.tsx         # Root layout
│   ├── components/            # Reusable UI components
│   │   ├── auth/             # Authentication components
│   │   ├── dashboard/        # Dashboard-specific components
│   │   └── ui/               # Base UI components
│   ├── lib/                  # Business logic and utilities
│   │   ├── firebase/         # Firebase configuration and services
│   │   ├── services/         # Business logic services
│   │   └── utils/            # Utility functions
│   └── contexts/             # React contexts
├── public/                   # Static assets
├── firestore.rules          # Firestore security rules
├── firestore.indexes.json   # Firestore indexes
└── firebase.json            # Firebase configuration
```

## 🎭 User Roles and Access

The system supports multiple user roles:

- **Admin**: Full system access
- **HR**: Employee management, payroll, attendance
- **Accountant**: Financial operations, expense approval
- **Purchasing Manager**: Supplier management, procurement
- **Receiver**: Receiving goods, inventory updates
- **Stock Manager**: Inventory management

## 🔧 Development Workflow

### 1. Making Changes
1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run tests: `yarn test`
4. Check linting: `yarn lint`
5. Type check: `yarn type-check`
6. Commit and push

### 2. Before Committing
```bash
# Run pre-commit checks
yarn precommit
```

### 3. Testing Your Changes
```bash
# Test specific role functionality
yarn test-hr-db          # Test HR database
yarn test-hr-permissions # Test HR permissions
```

## 🔥 Firebase Setup

### Required Firebase Services
- **Authentication**: Email/Password provider
- **Firestore**: NoSQL database
- **Hosting**: (Optional) For deployment
- **Storage**: (Future) For file uploads

### Firestore Collections
The system uses these main collections:
- `employees` - Employee records
- `suppliers` - Supplier information
- `invoices` - Invoice data
- `payments` - Payment records
- `deliveries` - Delivery tracking
- `attendance` - Employee attendance
- `cashAllocations` - Financial allocations

### Security Rules
Firestore rules enforce role-based access control. Deploy with:
```bash
yarn deploy-rules
```

## 🚨 Troubleshooting

### Common Issues

**1. Firebase Connection Errors**
- Check your `.env.local` file
- Verify Firebase project settings
- Ensure Firestore is enabled

**2. Permission Denied Errors**
- Run `yarn deploy-rules`
- Check user roles in Firebase Auth
- Verify employee records exist

**3. Build Errors**
- Clear cache: `yarn clean`
- Reinstall dependencies: `rm -rf node_modules && yarn install`
- Check TypeScript errors: `yarn type-check`

**4. Test Failures**
- Ensure Firebase emulators are stopped
- Clear test cache: `yarn test --clearCache`
- Check test setup in `jest.setup.js`

### Debug Commands
```bash
# Check system status
yarn test-hr-db

# Debug permissions
yarn test-hr-permissions

# View logs (in browser console)
logger.getLogs()

# Clear application logs
logger.clearLogs()
```

## 📱 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📞 Support

For development support:
1. Check the troubleshooting section
2. Review Firebase documentation
3. Check browser console for errors
4. Run debug commands

## 🎉 Success!

If you've reached this point, your development environment should be ready! 

Visit `http://localhost:3000` to start using the application.

---

**Next Steps:**
- Explore the dashboards for different roles
- Review the codebase structure
- Check out the Firebase console for real-time data
- Start developing new features! 