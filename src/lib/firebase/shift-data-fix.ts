/**
 * 🔧 Shift Data Fix Utility
 * Ensures proper handling of day/night shift data across all services
 */

/**
 * Normalize shift data from various sources
 * ✅ HANDLES: 'day', 'night', 'Day', 'Night', 'DAY', 'NIGHT', timestamps, etc.
 */
export const normalizeShiftData = (
  shiftValue: any, 
  timestamp?: Date | string | any,
  fallbackToDay: boolean = true
): 'day' | 'night' => {
  
  // Direct string matching (case insensitive)
  if (typeof shiftValue === 'string') {
    const shift = shiftValue.toLowerCase().trim();
    
    if (shift === 'day' || shift === 'morning' || shift === 'am') {
      return 'day';
    }
    
    if (shift === 'night' || shift === 'evening' || shift === 'pm') {
      return 'night';
    }
  }
  
  // Try to infer from timestamp
  if (timestamp) {
    try {
      let dateObj: Date;
      
      if (timestamp instanceof Date) {
        dateObj = timestamp;
      } else if (typeof timestamp === 'string') {
        dateObj = new Date(timestamp);
      } else if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        dateObj = timestamp.toDate(); // Firestore Timestamp
      } else if (timestamp.seconds) {
        dateObj = new Date(timestamp.seconds * 1000); // Firestore Timestamp format
      } else {
        dateObj = new Date(timestamp);
      }
      
      const hour = dateObj.getHours();
      
      // Day shift: 6 AM to 6 PM (6-17)
      // Night shift: 6 PM to 6 AM (18-5)
      if (hour >= 6 && hour < 18) {
        console.log(`🌅 Inferred DAY shift from hour: ${hour}`);
        return 'day';
      } else {
        console.log(`🌙 Inferred NIGHT shift from hour: ${hour}`);
        return 'night';
      }
      
    } catch (error) {
      console.warn('⚠️ Could not parse timestamp for shift inference:', timestamp, error);
    }
  }
  
  // Fallback
  if (fallbackToDay) {
    console.warn(`🚨 Could not determine shift from value: "${shiftValue}" - defaulting to DAY`);
    return 'day';
  } else {
    console.warn(`🚨 Could not determine shift from value: "${shiftValue}" - defaulting to NIGHT`);
    return 'night';
  }
};

/**
 * Extract shift data from cash close record
 * ✅ HANDLES multiple cash close data formats
 */
export const extractShiftFromCashClose = (cashCloseData: any): 'day' | 'night' => {
  console.log('🔍 Extracting shift from cash close data:', {
    shiftField: cashCloseData.shift,
    shiftTypeField: cashCloseData.shiftType,
    timeField: cashCloseData.time,
    timestampField: cashCloseData.timestamp,
    createdAtField: cashCloseData.createdAt
  });
  
  // Try primary shift field
  if (cashCloseData.shift) {
    return normalizeShiftData(
      cashCloseData.shift, 
      cashCloseData.time || cashCloseData.timestamp || cashCloseData.createdAt
    );
  }
  
  // Try alternative shift field names
  if (cashCloseData.shiftType) {
    return normalizeShiftData(
      cashCloseData.shiftType,
      cashCloseData.time || cashCloseData.timestamp || cashCloseData.createdAt
    );
  }
  
  // Try to infer from time fields only
  const timeField = cashCloseData.time || 
                   cashCloseData.timestamp || 
                   cashCloseData.createdAt ||
                   cashCloseData.cashCloseDate;
                   
  if (timeField) {
    return normalizeShiftData(null, timeField);
  }
  
  // Last resort - check if there's shift info in nested data
  if (cashCloseData.shifts && Array.isArray(cashCloseData.shifts) && cashCloseData.shifts.length > 0) {
    const firstShift = cashCloseData.shifts[0];
    if (firstShift.shift) {
      console.log('📊 Found shift in nested shifts data:', firstShift.shift);
      return normalizeShiftData(firstShift.shift);
    }
  }
  
  console.warn('🚨 No shift data found - defaulting to day');
  return 'day';
};

/**
 * Process cash close shifts data properly
 * ✅ SEPARATES day and night shift data correctly
 */
export const processCashCloseShifts = (cashCloseData: any): {
  dayShiftData: any;
  nightShiftData: any;
  hasMultipleShifts: boolean;
} => {
  
  console.log('📊 Processing cash close shifts:', {
    hasShiftsArray: !!cashCloseData.shifts,
    shiftsCount: cashCloseData.shifts?.length || 0
  });
  
  let dayShiftData: any = null;
  let nightShiftData: any = null;
  
  if (cashCloseData.shifts && Array.isArray(cashCloseData.shifts)) {
    // Process each shift separately
    for (const shiftRecord of cashCloseData.shifts) {
      const shiftType = normalizeShiftData(
        shiftRecord.shift, 
        shiftRecord.time || shiftRecord.timestamp || cashCloseData.time
      );
      
      console.log(`📅 Processing ${shiftType} shift data:`, {
        shift: shiftRecord.shift,
        tillsCount: shiftRecord.tills?.length || 0,
        networkPaymentsCount: shiftRecord.tills?.reduce((sum: number, till: any) => 
          sum + (till.networkPayments?.length || 0), 0) || 0
      });
      
      if (shiftType === 'day') {
        dayShiftData = {
          ...shiftRecord,
          shift: 'day',
          actualShift: shiftType
        };
      } else {
        nightShiftData = {
          ...shiftRecord,
          shift: 'night', 
          actualShift: shiftType
        };
      }
    }
  } else {
    // Single shift data - determine which shift it represents
    const shiftType = extractShiftFromCashClose(cashCloseData);
    
    const shiftData = {
      shift: shiftType,
      tills: cashCloseData.tills || [],
      time: cashCloseData.time,
      timestamp: cashCloseData.timestamp || cashCloseData.createdAt
    };
    
    if (shiftType === 'day') {
      dayShiftData = shiftData;
    } else {
      nightShiftData = shiftData;
    }
  }
  
  const hasMultipleShifts = !!(dayShiftData && nightShiftData);
  
  console.log('✅ Shift processing complete:', {
    hasDayShift: !!dayShiftData,
    hasNightShift: !!nightShiftData,
    hasMultipleShifts,
    dayShiftTills: dayShiftData?.tills?.length || 0,
    nightShiftTills: nightShiftData?.tills?.length || 0
  });
  
  return {
    dayShiftData: dayShiftData || {
      shift: 'day',
      tills: [],
      actualShift: 'day'
    },
    nightShiftData: nightShiftData || {
      shift: 'night', 
      tills: [],
      actualShift: 'night'
    },
    hasMultipleShifts
  };
};

/**
 * Debug shift data issues
 */
export const debugShiftData = (cashCloseData: any, context: string = '') => {
  console.log(`🔍 SHIFT DEBUG ${context}:`, {
    dataType: typeof cashCloseData,
    hasShiftField: 'shift' in cashCloseData,
    shiftValue: cashCloseData.shift,
    hasShiftsArray: 'shifts' in cashCloseData,
    shiftsArrayLength: cashCloseData.shifts?.length,
    shiftsData: cashCloseData.shifts?.map((s: any) => ({
      shift: s.shift,
      tillsCount: s.tills?.length
    })),
    timeFields: {
      time: cashCloseData.time,
      timestamp: cashCloseData.timestamp,
      createdAt: cashCloseData.createdAt
    }
  });
};















