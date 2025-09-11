// Script to inspect actual fields in cash close documents
const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  getDocs,
  limit,
  query
} = require('firebase/firestore');

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDyKJOFqPHPBsTNKK3XLvW1PpTlJvF7Lzg",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "equityauth.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "equityauth",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "equityauth.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "598171395411",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:598171395411:web:c21b37e04e006b8bf94d4b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper to get field type
function getFieldType(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (value?.toDate && typeof value.toDate === 'function') return 'Timestamp';
  if (Array.isArray(value)) return `Array[${value.length}]`;
  if (value instanceof Date) return 'Date';
  return typeof value;
}

// Helper to format value for display
function formatValue(value) {
  if (value === null || value === undefined) return value;
  if (value?.toDate && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'object') return '[Object]';
  return value;
}

// Extract all unique field paths from an object
function extractFieldPaths(obj, prefix = '') {
  const fields = {};
  
  for (const key in obj) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    const type = getFieldType(value);
    
    fields[fullPath] = {
      type: type,
      sampleValue: formatValue(value)
    };
    
    // Recurse for arrays and objects (but not too deep)
    if (Array.isArray(value) && value.length > 0 && prefix.split('.').length < 3) {
      if (typeof value[0] === 'object' && value[0] !== null) {
        const subFields = extractFieldPaths(value[0], `${fullPath}[0]`);
        Object.assign(fields, subFields);
      }
    } else if (type === 'object' && value !== null && prefix.split('.').length < 3) {
      const subFields = extractFieldPaths(value, fullPath);
      Object.assign(fields, subFields);
    }
  }
  
  return fields;
}

async function inspectCashCloseFields() {
  console.log('🔍 Cash Close Field Inspector\n');
  console.log('=' .repeat(60));
  
  try {
    // Get sample documents
    const q = query(collection(db, 'cashCloses'), limit(5));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('\n❌ No documents found in cashCloses collection');
      console.log('The collection is empty. Create some cash close records first.\n');
      return;
    }
    
    console.log(`\n✅ Found ${snapshot.size} document(s) in cashCloses collection\n`);
    
    // Collect all unique fields across documents
    const allFields = {};
    let docIndex = 0;
    
    snapshot.docs.forEach(doc => {
      docIndex++;
      const data = doc.data();
      const fields = extractFieldPaths(data);
      
      console.log(`\n📄 Document ${docIndex}: ${doc.id}`);
      console.log('-' .repeat(40));
      
      // Merge fields
      Object.keys(fields).forEach(fieldPath => {
        if (!allFields[fieldPath]) {
          allFields[fieldPath] = {
            type: fields[fieldPath].type,
            sampleValues: [],
            frequency: 0
          };
        }
        allFields[fieldPath].frequency++;
        if (allFields[fieldPath].sampleValues.length < 3) {
          allFields[fieldPath].sampleValues.push(fields[fieldPath].sampleValue);
        }
      });
      
      // Show key fields for this document
      console.log(`  Date: ${fields['cashCloseDate']?.sampleValue || fields['date']?.sampleValue || 'N/A'}`);
      console.log(`  Shift: ${fields['shift']?.sampleValue || fields['shifts[0].shift']?.sampleValue || 'N/A'}`);
      console.log(`  Total Cash: ${fields['totalCashInTill']?.sampleValue || fields['closeCash']?.sampleValue || 'N/A'}`);
      console.log(`  Total Revenue: ${fields['totalRevenue']?.sampleValue || 'N/A'}`);
    });
    
    // Display all fields summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 COMPLETE FIELD INVENTORY');
    console.log('=' .repeat(60));
    
    // Sort fields by frequency and name
    const sortedFields = Object.entries(allFields)
      .sort((a, b) => {
        if (b[1].frequency !== a[1].frequency) {
          return b[1].frequency - a[1].frequency;
        }
        return a[0].localeCompare(b[0]);
      });
    
    // Group fields by category
    const categories = {
      'Core Fields': [],
      'Date Fields': [],
      'Financial Fields': [],
      'Shift Fields': [],
      'Till Fields': [],
      'Network Fields': [],
      'Metadata': [],
      'Other': []
    };
    
    sortedFields.forEach(([field, info]) => {
      const entry = {
        field,
        type: info.type,
        frequency: `${info.frequency}/${snapshot.size}`,
        sample: info.sampleValues[0]
      };
      
      if (field.includes('date') || field.includes('Date') || field.includes('At')) {
        categories['Date Fields'].push(entry);
      } else if (field.includes('shift') || field.includes('Shift')) {
        categories['Shift Fields'].push(entry);
      } else if (field.includes('till') || field.includes('Till')) {
        categories['Till Fields'].push(entry);
      } else if (field.includes('network') || field.includes('Network') || 
                 field.includes('airtel') || field.includes('mtn') || 
                 field.includes('Bank')) {
        categories['Network Fields'].push(entry);
      } else if (field.includes('total') || field.includes('amount') || 
                 field.includes('Amount') || field.includes('revenue') ||
                 field.includes('profit') || field.includes('funds') ||
                 field.includes('cash') || field.includes('Cash')) {
        categories['Financial Fields'].push(entry);
      } else if (field === 'id' || field.includes('created') || 
                 field.includes('updated') || field.includes('status') ||
                 field.includes('By')) {
        categories['Metadata'].push(entry);
      } else if (field === 'totalCashInTill' || field === 'totalRevenue' ||
                 field === 'closeCash' || field === 'shift') {
        categories['Core Fields'].push(entry);
      } else {
        categories['Other'].push(entry);
      }
    });
    
    // Display by category
    Object.entries(categories).forEach(([category, fields]) => {
      if (fields.length > 0) {
        console.log(`\n### ${category}`);
        console.log('-' .repeat(60));
        
        fields.forEach(({ field, type, frequency, sample }) => {
          const paddedField = field.padEnd(35);
          const paddedType = type.padEnd(12);
          const paddedFreq = frequency.padEnd(5);
          console.log(`  ${paddedField} ${paddedType} ${paddedFreq} ${sample || ''}`);
        });
      }
    });
    
    // Summary statistics
    console.log('\n' + '=' .repeat(60));
    console.log('📈 SUMMARY STATISTICS');
    console.log('=' .repeat(60));
    console.log(`  Total Unique Fields: ${sortedFields.length}`);
    console.log(`  Documents Analyzed: ${snapshot.size}`);
    console.log(`  Most Common Field Type: ${getMostCommonType(allFields)}`);
    
    // Required fields (present in all documents)
    const requiredFields = sortedFields
      .filter(([_, info]) => info.frequency === snapshot.size)
      .map(([field]) => field);
    
    if (requiredFields.length > 0) {
      console.log(`\n  ✅ Fields Present in ALL Documents (${requiredFields.length}):`);
      requiredFields.slice(0, 10).forEach(field => {
        console.log(`     - ${field}`);
      });
      if (requiredFields.length > 10) {
        console.log(`     ... and ${requiredFields.length - 10} more`);
      }
    }
    
    // Optional fields
    const optionalFields = sortedFields
      .filter(([_, info]) => info.frequency < snapshot.size)
      .map(([field, info]) => ({ field, frequency: info.frequency }));
    
    if (optionalFields.length > 0) {
      console.log(`\n  ⚡ Optional/Variable Fields (${optionalFields.length}):`);
      optionalFields.slice(0, 5).forEach(({ field, frequency }) => {
        console.log(`     - ${field} (in ${frequency}/${snapshot.size} docs)`);
      });
      if (optionalFields.length > 5) {
        console.log(`     ... and ${optionalFields.length - 5} more`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error inspecting cash closes:', error);
    console.error('Details:', error.message);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ Inspection Complete!\n');
  
  process.exit(0);
}

function getMostCommonType(allFields) {
  const typeCounts = {};
  Object.values(allFields).forEach(info => {
    typeCounts[info.type] = (typeCounts[info.type] || 0) + 1;
  });
  
  let maxType = 'unknown';
  let maxCount = 0;
  Object.entries(typeCounts).forEach(([type, count]) => {
    if (count > maxCount) {
      maxType = type;
      maxCount = count;
    }
  });
  
  return `${maxType} (${maxCount} fields)`;
}

// Run the inspection
inspectCashCloseFields();








