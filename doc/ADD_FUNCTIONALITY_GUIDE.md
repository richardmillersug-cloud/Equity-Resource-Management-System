# Add Functionality to Pages Guide

## ✨ Enhanced Functionalities Available

I've created a comprehensive set of reusable functionalities that you can add to any page. Here's what's available:

## 🔧 Available Functionalities

### 1. **Search & Filter**
- Multi-field search
- Dynamic filters
- Sorting capabilities
- Real-time filtering

### 2. **Bulk Actions**
- Select individual items
- Select all/none
- Bulk operations (delete, update, export)
- Visual feedback

### 3. **Pagination**
- Configurable page sizes
- Navigation controls
- Item count display
- Performance optimization

### 4. **Export Options**
- CSV export
- JSON export
- Excel export (with library)
- Custom formatting

### 5. **Modal/Dialog Management**
- Open/close states
- Data passing
- Multiple modals
- Form integration

### 6. **Form Management**
- Field validation
- Error handling
- Auto-reset
- Submit states

### 7. **Notifications/Toasts**
- Success/error messages
- Auto-dismiss
- Multiple types
- Queue management

### 8. **Real-time Data**
- Live updates
- Subscription management
- Error handling
- Loading states

### 9. **Analytics**
- Statistical calculations
- Data grouping
- Top items analysis
- Performance metrics

### 10. **Component State**
- Tab management
- Expandable sections
- View modes
- UI state

## 🚀 Quick Implementation

### Example 1: Adding Search & Filter to Any Page

```tsx
import { useSearchAndFilter } from '../../utils/pageFunctionalities';

export default function MyPage() {
  const [data, setData] = useState([]);
  
  const {
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    filteredData
  } = useSearchAndFilter(data, ['name', 'description', 'status']);

  return (
    <div>
      {/* Search Input */}
      <input
        type="text"
        placeholder="Search..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="px-4 py-2 border rounded-lg"
      />

      {/* Filter Dropdown */}
      <select
        value={filters.status || ''}
        onChange={(e) => setFilters({...filters, status: e.target.value})}
        className="px-4 py-2 border rounded-lg"
      >
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>

      {/* Results */}
      <div>
        {filteredData.map(item => (
          <div key={item.id}>{item.name}</div>
        ))}
      </div>
    </div>
  );
}
```

### Example 2: Adding Bulk Actions

```tsx
import { useBulkActions } from '../../utils/pageFunctionalities';

export default function MyPage() {
  const [data, setData] = useState([]);
  
  const {
    selectedItems,
    bulkMode,
    setBulkMode,
    selectItem,
    selectAll,
    getSelectedData
  } = useBulkActions(data);

  const handleBulkDelete = async () => {
    const selected = getSelectedData();
    // Delete selected items
    await Promise.all(selected.map(item => deleteItem(item.id)));
    // Refresh data
    loadData();
  };

  return (
    <div>
      {/* Bulk Mode Toggle */}
      <button 
        onClick={() => setBulkMode(!bulkMode)}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        {bulkMode ? 'Exit Bulk Mode' : 'Enable Bulk Actions'}
      </button>

      {/* Bulk Actions */}
      {bulkMode && (
        <div className="flex gap-2">
          <button onClick={() => selectAll(true)}>Select All</button>
          <button onClick={() => selectAll(false)}>Deselect All</button>
          <button onClick={handleBulkDelete}>Delete Selected</button>
        </div>
      )}

      {/* Data List */}
      {data.map(item => (
        <div key={item.id} className="flex items-center gap-2">
          {bulkMode && (
            <input
              type="checkbox"
              checked={selectedItems.has(item.id)}
              onChange={(e) => selectItem(item.id, e.target.checked)}
            />
          )}
          <span>{item.name}</span>
        </div>
      ))}
    </div>
  );
}
```

### Example 3: Adding Pagination

```tsx
import { usePagination } from '../../utils/pageFunctionalities';

export default function MyPage() {
  const [data, setData] = useState([]);
  
  const {
    currentData,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
    hasNext,
    hasPrev
  } = usePagination(data, 10);

  return (
    <div>
      {/* Data Display */}
      {currentData.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}

      {/* Pagination Controls */}
      <div className="flex items-center gap-2">
        <button 
          onClick={prevPage} 
          disabled={!hasPrev}
          className="px-3 py-1 bg-gray-200 rounded"
        >
          Previous
        </button>
        
        <span>Page {currentPage} of {totalPages}</span>
        
        <button 
          onClick={nextPage} 
          disabled={!hasNext}
          className="px-3 py-1 bg-gray-200 rounded"
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

### Example 4: Adding Export Functionality

```tsx
import { useExport } from '../../utils/pageFunctionalities';

export default function MyPage() {
  const [data, setData] = useState([]);
  const { exportToCSV, exportToJSON } = useExport();

  return (
    <div>
      {/* Export Buttons */}
      <div className="flex gap-2">
        <button 
          onClick={() => exportToCSV(data, 'my-data')}
          className="px-4 py-2 bg-green-600 text-white rounded"
        >
          Export CSV
        </button>
        
        <button 
          onClick={() => exportToJSON(data, 'my-data')}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Export JSON
        </button>
      </div>

      {/* Your data display */}
    </div>
  );
}
```

### Example 5: Adding Notifications

```tsx
import { useNotifications } from '../../utils/pageFunctionalities';

export default function MyPage() {
  const { notifications, success, error, removeNotification } = useNotifications();

  const handleSave = async () => {
    try {
      await saveData();
      success('Data saved successfully!');
    } catch (err) {
      error('Failed to save data');
    }
  };

  return (
    <div>
      {/* Notifications */}
      <div className="fixed top-4 right-4 space-y-2 z-50">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg shadow-lg ${
              notification.type === 'success' ? 'bg-green-500 text-white' :
              notification.type === 'error' ? 'bg-red-500 text-white' :
              'bg-blue-500 text-white'
            }`}
          >
            <div className="flex justify-between items-center">
              <span>{notification.message}</span>
              <button onClick={() => removeNotification(notification.id)}>×</button>
            </div>
          </div>
        ))}
      </div>

      {/* Your page content */}
      <button onClick={handleSave}>Save Data</button>
    </div>
  );
}
```

## 🎯 What I Added to CSV Analyzer Page

I enhanced the CSV Analyzer page with:

### ✅ **New Features Added:**

1. **Bulk Actions Mode**
   - Toggle bulk selection on/off
   - Select/deselect all files
   - Checkbox selection for individual files

2. **Bulk Operations**
   - Delete multiple files at once
   - Update status for multiple files
   - Export analysis for selected files
   - Compare multiple files side-by-side

3. **Advanced Filters**
   - Collapsible filter section
   - Year, month, and status filtering
   - Real-time filter application

4. **File Comparison Modal**
   - Side-by-side file comparison
   - Quick statistics overview
   - Direct analysis from comparison view

5. **Enhanced UI**
   - Visual feedback for selections
   - Better organization of controls
   - Responsive design improvements

## 🛠️ How to Apply These to Other Pages

### Step 1: Import the functionality you need
```tsx
import { 
  useSearchAndFilter, 
  useBulkActions, 
  usePagination,
  useExport,
  useNotifications 
} from '../../utils/pageFunctionalities';
```

### Step 2: Add to your component
```tsx
export default function MyPage() {
  const [data, setData] = useState([]);
  
  // Add the functionalities you want
  const search = useSearchAndFilter(data, ['name', 'email']);
  const bulk = useBulkActions(data);
  const pagination = usePagination(search.filteredData, 10);
  const { exportToCSV } = useExport();
  const notify = useNotifications();

  // Your existing logic...
}
```

### Step 3: Use in your JSX
```tsx
return (
  <div>
    {/* Search */}
    <input 
      value={search.searchTerm}
      onChange={(e) => search.setSearchTerm(e.target.value)}
    />

    {/* Bulk actions */}
    {bulk.selectedCount > 0 && (
      <button onClick={handleBulkAction}>
        Delete {bulk.selectedCount} items
      </button>
    )}

    {/* Data with pagination */}
    {pagination.currentData.map(item => (
      <div key={item.id}>
        {bulk.bulkMode && (
          <input 
            type="checkbox"
            checked={bulk.selectedItems.has(item.id)}
            onChange={(e) => bulk.selectItem(item.id, e.target.checked)}
          />
        )}
        {item.name}
      </div>
    ))}

    {/* Pagination controls */}
    <button onClick={pagination.prevPage} disabled={!pagination.hasPrev}>
      Previous
    </button>
    <button onClick={pagination.nextPage} disabled={!pagination.hasNext}>
      Next
    </button>
  </div>
);
```

## 📁 Files Created/Updated

1. **`src/app/dashboard/managing-director/csv-analyzer/page.tsx`** - Enhanced with all new functionalities
2. **`src/utils/pageFunctionalities.ts`** - Reusable functionality hooks
3. **`ADD_FUNCTIONALITY_GUIDE.md`** - This comprehensive guide

## 🎉 Ready to Use!

You now have:
- ✅ Enhanced CSV Analyzer with bulk actions, comparison, and advanced filtering
- ✅ Reusable functionality library for any page
- ✅ Complete examples and patterns
- ✅ Production-ready code

Just pick the functionalities you want and add them to any page using the patterns shown above!

## 💡 Next Steps

You can:
1. Apply these patterns to other pages in your dashboard
2. Customize the styling to match your design system
3. Add additional functionalities as needed
4. Extend the existing functions with more features

Which page would you like me to enhance next?