export interface ScanTracker {
  employeeId: string;
  currentShiftScans: number;
  lastScanTime: Date;
  shiftStartTime?: Date;
  shiftEndTime?: Date;
}

export interface ShiftScanRecord {
  id: string;
  employeeId: string;
  attendanceId: string;
  shiftDate: Date;
  shiftStartTotalScans: number;
  shiftEndTotalScans?: number;
  totalScansDuringShift?: number;
  createdAt: Date;
  updatedAt: Date;
}

export class ScanTrackingService {
  private scanTrackers: Map<string, ScanTracker> = new Map();

  /**
   * Records a new scan for an employee
   */
  recordScan(employeeId: string): void {
    const tracker = this.scanTrackers.get(employeeId) || {
      employeeId,
      currentShiftScans: 0,
      lastScanTime: new Date()
    };

    tracker.currentShiftScans++;
    tracker.lastScanTime = new Date();
    
    this.scanTrackers.set(employeeId, tracker);
  }

  /**
   * Gets current scan count for an employee
   */
  getCurrentScanCount(employeeId: string): number {
    const tracker = this.scanTrackers.get(employeeId);
    return tracker?.currentShiftScans || 0;
  }

  /**
   * Records shift start total scans
   */
  recordShiftStart(employeeId: string): number {
    const tracker = this.scanTrackers.get(employeeId) || {
      employeeId,
      currentShiftScans: 0,
      lastScanTime: new Date(),
      shiftStartTime: new Date()
    };

    tracker.shiftStartTime = new Date();
    tracker.currentShiftScans = 0; // Reset for new shift
    
    this.scanTrackers.set(employeeId, tracker);
    
    return tracker.currentShiftScans;
  }

  /**
   * Records shift end total scans and calculates shift totals
   */
  recordShiftEnd(employeeId: string): {
    shiftEndTotalScans: number;
    totalScansDuringShift: number;
  } {
    const tracker = this.scanTrackers.get(employeeId);
    
    if (!tracker) {
      throw new Error('No scan tracker found for employee');
    }

    tracker.shiftEndTime = new Date();
    const shiftEndTotalScans = tracker.currentShiftScans;
    const totalScansDuringShift = tracker.currentShiftScans;

    // Reset for next shift
    tracker.currentShiftScans = 0;
    tracker.shiftStartTime = undefined;
    tracker.shiftEndTime = undefined;

    this.scanTrackers.set(employeeId, tracker);

    return {
      shiftEndTotalScans,
      totalScansDuringShift
    };
  }

  /**
   * Gets scan statistics for an employee
   */
  getScanStats(employeeId: string): {
    currentShiftScans: number;
    lastScanTime?: Date;
    shiftStartTime?: Date;
    isShiftActive: boolean;
  } {
    const tracker = this.scanTrackers.get(employeeId);
    
    return {
      currentShiftScans: tracker?.currentShiftScans || 0,
      lastScanTime: tracker?.lastScanTime,
      shiftStartTime: tracker?.shiftStartTime,
      isShiftActive: !!tracker?.shiftStartTime && !tracker?.shiftEndTime
    };
  }

  /**
   * Resets scan count for an employee (useful for testing or manual reset)
   */
  resetScanCount(employeeId: string): void {
    const tracker = this.scanTrackers.get(employeeId);
    if (tracker) {
      tracker.currentShiftScans = 0;
      tracker.lastScanTime = new Date();
      this.scanTrackers.set(employeeId, tracker);
    }
  }

  /**
   * Gets all active scan trackers
   */
  getAllActiveTrackers(): ScanTracker[] {
    return Array.from(this.scanTrackers.values())
      .filter(tracker => tracker.shiftStartTime && !tracker.shiftEndTime);
  }

  /**
   * Clears all scan trackers (useful for daily reset)
   */
  clearAllTrackers(): void {
    this.scanTrackers.clear();
  }
}

// Export singleton instance
export const scanTrackingService = new ScanTrackingService(); 