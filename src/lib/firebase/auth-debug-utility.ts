/**
 * Authentication Debug Utility
 * Helper to debug authentication issues in the Analytics Dashboard
 */

import { authService } from './auth';

export class AuthDebugUtility {
  
  /**
   * Check current authentication status and log detailed info
   */
  static checkAuthStatus(): { 
    authenticated: boolean; 
    user?: any; 
    error?: string; 
    recommendations: string[] 
  } {
    console.log('🔍 Checking authentication status...');
    
    try {
      const user = authService.getCurrentUser();
      
      if (!user) {
        console.log('❌ No authenticated user found');
        return {
          authenticated: false,
          error: 'No authenticated user found',
          recommendations: [
            'Please log in to the system',
            'Check if you were logged out due to session expiry', 
            'Verify Firebase authentication is properly configured',
            'Try refreshing the page and logging in again'
          ]
        };
      }

      console.log('✅ User authenticated:', {
        uid: user.uid,
        role: user.role,
        email: user.email,
        branch: user.branch?.name || 'No branch',
        hasEmployeeData: !!user.employee
      });

      // Check role permissions for analytics
      const analyticsRoles = ['Admin', 'Manager', 'Accountant', 'Managing Director'];
      const hasAnalyticsAccess = analyticsRoles.includes(user.role);

      const recommendations: string[] = [];
      
      if (!hasAnalyticsAccess) {
        recommendations.push(`⚠️ Your role (${user.role}) may not have access to Analytics Dashboard`);
        recommendations.push('Contact an administrator to get appropriate role permissions');
      } else {
        recommendations.push(`✅ Your role (${user.role}) has access to Analytics Dashboard`);
      }

      if (!user.branch) {
        recommendations.push('⚠️ No branch information found - may affect data filtering');
      }

      return {
        authenticated: true,
        user: {
          uid: user.uid,
          role: user.role,
          email: user.email,
          branch: user.branch?.name || 'No branch',
          hasAnalyticsAccess
        },
        recommendations
      };

    } catch (error: any) {
      console.error('❌ Error checking authentication:', error);
      return {
        authenticated: false,
        error: error.message,
        recommendations: [
          'There was an error checking authentication',
          'Try refreshing the page',
          'Check browser console for more details',
          'Contact support if the issue persists'
        ]
      };
    }
  }

  /**
   * Log detailed authentication info to console
   */
  static logAuthStatus(): void {
    const status = this.checkAuthStatus();
    
    console.log('\n🔐 === AUTHENTICATION STATUS ===');
    console.log(`✅ Authenticated: ${status.authenticated}`);
    
    if (status.user) {
      console.log(`👤 User: ${status.user.email} (${status.user.role})`);
      console.log(`🏢 Branch: ${status.user.branch}`);
      console.log(`📊 Analytics Access: ${status.user.hasAnalyticsAccess ? 'YES' : 'NO'}`);
    }
    
    if (status.error) {
      console.log(`❌ Error: ${status.error}`);
    }
    
    console.log('\n💡 RECOMMENDATIONS:');
    status.recommendations.forEach(rec => console.log(`  ${rec}`));
    console.log('=================================\n');
  }

  /**
   * Quick check if user can access analytics
   */
  static canAccessAnalytics(): boolean {
    try {
      const user = authService.getCurrentUser();
      if (!user) return false;
      
      const analyticsRoles = ['Admin', 'Manager', 'Accountant', 'Managing Director'];
      return analyticsRoles.includes(user.role);
    } catch {
      return false;
    }
  }
}

// Export singleton instance  
export const authDebugUtility = new AuthDebugUtility();



































