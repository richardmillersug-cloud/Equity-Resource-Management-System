# Firebase Setup Guide

## 🔥 Resolving Firestore Index Errors

You're seeing Firebase index errors because your queries require composite indexes. Here's how to fix them:

### Quick Fix Options

#### Option 1: Automatic Index Creation (Recommended)
1. **Install Firebase CLI:**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase:**
   ```bash
   firebase login
   ```

3. **Initialize your project:**
   ```bash
   firebase use --add
   # Select your project: equitysys-41320
   ```

4. **Deploy the indexes:**
   ```bash
   firebase deploy --only firestore:indexes
   ```

#### Option 2: Manual Index Creation
Click the links in your console errors to create indexes manually:
- [Create Inventory Index](https://console.firebase.google.com/v1/r/project/equitysys-41320/firestore/indexes?create_composite=ClFwcm9qZWN0cy9lcXVpdHlzeXMtNDEzMjAvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2ludmVudG9yeS9pbmRleGVzL18QARoMCghicmFuY2hJZBABGgoKBnN0YXR1cxABGhAKDGN1cnJlbnRTdG9jaxABGgwKCF9fbmFtZV9fEAE)
- [Create Deliveries Index](https://console.firebase.google.com/v1/r/project/equitysys-41320/firestore/indexes?create_composite=ClJwcm9qZWN0cy9lcXVpdHlzeXMtNDEzMjAvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2RlbGl2ZXJpZXMvaW5kZXhlcy9fEAEaDgoKcmVjZWl2ZXJJZBABGhEKDXNjaGVkdWxlZERhdGUQARoRCg1zY2hlZHVsZWRUaW1lEAEaDAoIX19uYW1lX18QAQ)

### Required Indexes

The following composite indexes are required for your application:

#### 1. Inventory Collection
- **Fields:** `branchId` (ASC) → `status` (ASC) → `currentStock` (ASC)
- **Purpose:** Efficient querying of inventory items by branch and status

#### 2. Deliveries Collection (Date & Status)
- **Fields:** `scheduledDate` (ASC) → `status` (ASC)
- **Purpose:** Querying deliveries by date and status

#### 3. Deliveries Collection (Receiver-specific)
- **Fields:** `receiverId` (ASC) → `scheduledDate` (ASC)
- **Purpose:** Getting deliveries for specific receivers

#### 4. Deliveries Collection (Complex Query)
- **Fields:** `receiverId` (ASC) → `scheduledDate` (ASC) → `scheduledTime` (ASC)
- **Purpose:** Real-time delivery tracking with time-based sorting

#### 5. Employees Collection
- **Fields:** `branchId` (ASC) → `role` (ASC)
- **Purpose:** Role-based queries by branch

## 🚀 Performance Optimizations Applied

### Query Optimizations
1. **Reduced Complex Composite Indexes:** Simplified queries to use fewer compound conditions where possible
2. **Client-side Filtering:** Moved some filtering logic to the client to reduce index requirements
3. **Batch Fetching:** Optimized supplier name fetching with batch requests
4. **Query Limits:** Added limits to prevent large query results
5. **Better Error Handling:** Added comprehensive error handling for failed queries

### Real-time Subscription Improvements
1. **Error Recovery:** Subscriptions now handle errors gracefully
2. **Fallback Mechanisms:** Automatic fallback to empty arrays on errors
3. **Optimized Updates:** Reduced frequency of real-time updates with smart filtering

## 📊 Database Structure

### Collections Used
```
inventory/
├── branchId (string)
├── status (string: 'active' | 'discontinued' | 'out-of-stock')
├── currentStock (number)
├── restockThreshold (number)
├── itemName (string)
├── category (string)
├── supplierId (string, optional)
└── ... other fields

deliveries/
├── receiverId (string)
├── scheduledDate (timestamp)
├── scheduledTime (string: 'HH:MM')
├── status (string)
├── supplierId (string)
└── ... other fields

employees/
├── branchId (string)
├── role (string)
├── userId (string)
└── ... other fields
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. "Query requires an index" Error
- **Solution:** Create the required composite indexes using the methods above
- **Prevention:** Always test queries in development before deploying

#### 2. Slow Query Performance
- **Solution:** Ensure proper indexes are created and queries are optimized
- **Check:** Use Firebase Console to monitor query performance

#### 3. Real-time Subscription Errors
- **Solution:** The app now handles these gracefully with fallbacks
- **Monitor:** Check browser console for detailed error messages

### Monitoring
- **Firebase Console:** Monitor query performance and index usage
- **Browser DevTools:** Check for console errors and network requests
- **Application Logs:** Review error handling in the dashboard

## 🔧 Development Tips

### Testing Queries
1. Test all queries in Firebase Console first
2. Use small datasets during development
3. Monitor index creation status in Firebase Console

### Best Practices
1. **Limit Query Results:** Always use `limit()` for large collections
2. **Index Planning:** Plan indexes before writing complex queries
3. **Error Handling:** Always handle query errors gracefully
4. **Caching:** Consider caching frequently accessed data

## 📈 Next Steps

1. **Deploy Indexes:** Use the Firebase CLI to deploy the required indexes
2. **Monitor Performance:** Check query performance in Firebase Console
3. **Test Application:** Verify that all features work correctly after index deployment
4. **Optimize Further:** Consider additional optimizations based on usage patterns

---

**Need Help?** 
- Check the [Firebase Documentation](https://firebase.google.com/docs/firestore/query-data/indexing)
- Review the [Firestore Console](https://console.firebase.google.com/project/equitysys-41320/firestore)
- Monitor application logs for any remaining issues 