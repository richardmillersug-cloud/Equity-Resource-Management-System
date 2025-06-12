'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService, AuthUser } from '../../../lib/firebase/auth';
import { 
  Settings,
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Database,
  Key,
  Mail,
  Phone,
  Camera,
  Save,
  ArrowLeft,
  Eye,
  EyeOff,
  Check,
  X,
  AlertTriangle,
  Moon,
  Sun,
  Monitor,
  Volume2,
  VolumeX,
  Smartphone,
  Lock,
  Unlock,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  Edit3,
  Clock
} from 'lucide-react';

interface UserSettings {
  profile: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    avatar: string;
    department: string;
    position: string;
  };
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    timezone: string;
    dateFormat: string;
    currency: string;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
      desktop: boolean;
    };
    dashboard: {
      autoRefresh: boolean;
      refreshInterval: number;
      defaultView: string;
      compactMode: boolean;
    };
  };
  security: {
    twoFactorEnabled: boolean;
    sessionTimeout: number;
    passwordLastChanged: string;
    loginNotifications: boolean;
  };
  system: {
    dataRetention: number;
    backupFrequency: string;
    auditLogging: boolean;
    performanceMode: boolean;
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [settings, setSettings] = useState<UserSettings>({
    profile: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      avatar: '',
      department: '',
      position: ''
    },
    preferences: {
      theme: 'light',
      language: 'en',
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY',
      currency: 'UGX',
      notifications: {
        email: true,
        push: true,
        sms: false,
        desktop: true
      },
      dashboard: {
        autoRefresh: true,
        refreshInterval: 30,
        defaultView: 'overview',
        compactMode: false
      }
    },
    security: {
      twoFactorEnabled: false,
      sessionTimeout: 30,
      passwordLastChanged: '',
      loginNotifications: true
    },
    system: {
      dataRetention: 365,
      backupFrequency: 'daily',
      auditLogging: true,
      performanceMode: false
    }
  });

  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
      setLoading(true);
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
      
      if (user?.employee) {
        setSettings(prev => ({
          ...prev,
          profile: {
            firstName: user.employee.firstName || '',
            lastName: user.employee.lastName || '',
            email: user.employee.email || '',
            phone: user.employee.phone || '',
            avatar: user.employee.avatar || '',
            department: user.employee.department || '',
            position: user.employee.position || ''
          },
          security: {
            ...prev.security,
            passwordLastChanged: user.employee.passwordLastChanged || new Date().toISOString().split('T')[0]
          }
        }));
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      // Here you would save settings to your backend/Firebase
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      // Show success message
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      alert('New passwords do not match!');
      return;
    }
    
    if (passwordForm.new.length < 8) {
      alert('Password must be at least 8 characters long!');
      return;
    }

    try {
      setSaving(true);
      // Here you would change the password
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      setPasswordForm({ current: '', new: '', confirm: '' });
      alert('Password changed successfully!');
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Error changing password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getUserRole = (): string => {
    return currentUser?.employee?.role || 'User';
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
    { id: 'preferences', label: 'Preferences', icon: <Palette className="h-4 w-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
    { id: 'security', label: 'Security', icon: <Shield className="h-4 w-4" /> },
    ...(getUserRole() === 'Admin' ? [
      { id: 'system', label: 'System', icon: <Database className="h-4 w-4" /> }
    ] : [])
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Settings className="h-8 w-8 text-blue-600 mr-3" />
                Settings
              </h1>
              <p className="text-gray-600 mt-1">Manage your account and system preferences</p>
            </div>
          </div>
          
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-left ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-600 border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {tab.icon}
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Information</h2>
                  
                  {/* Avatar Section */}
                  <div className="flex items-center space-x-6 mb-6">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
                        {settings.profile.avatar ? (
                          <img 
                            src={settings.profile.avatar} 
                            alt="Avatar" 
                            className="w-20 h-20 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl font-bold text-blue-600">
                            {settings.profile.firstName.charAt(0)}{settings.profile.lastName.charAt(0)}
                          </span>
                        )}
                      </div>
                      <button className="absolute bottom-0 right-0 p-1 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors">
                        <Camera className="h-3 w-3" />
                      </button>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {settings.profile.firstName} {settings.profile.lastName}
                      </h3>
                      <p className="text-gray-600">{settings.profile.position}</p>
                      <p className="text-sm text-gray-500">{settings.profile.department}</p>
                    </div>
                  </div>

                  {/* Profile Form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={settings.profile.firstName}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          profile: { ...prev.profile, firstName: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={settings.profile.lastName}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          profile: { ...prev.profile, lastName: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="email"
                          value={settings.profile.email}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            profile: { ...prev.profile, email: e.target.value }
                          }))}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="tel"
                          value={settings.profile.phone}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            profile: { ...prev.profile, phone: e.target.value }
                          }))}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Department
                      </label>
                      <input
                        type="text"
                        value={settings.profile.department}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          profile: { ...prev.profile, department: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        readOnly
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Position
                      </label>
                      <input
                        type="text"
                        value={settings.profile.position}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          profile: { ...prev.profile, position: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Preferences</h2>
                  
                  {/* Theme Settings */}
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Appearance</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { value: 'light', label: 'Light', icon: <Sun className="h-4 w-4" /> },
                        { value: 'dark', label: 'Dark', icon: <Moon className="h-4 w-4" /> },
                        { value: 'system', label: 'System', icon: <Monitor className="h-4 w-4" /> }
                      ].map((theme) => (
                        <button
                          key={theme.value}
                          onClick={() => setSettings(prev => ({
                            ...prev,
                            preferences: { ...prev.preferences, theme: theme.value as any }
                          }))}
                          className={`p-4 border rounded-lg flex flex-col items-center space-y-2 transition-colors ${
                            settings.preferences.theme === theme.value
                              ? 'border-blue-500 bg-blue-50 text-blue-600'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {theme.icon}
                          <span className="text-sm font-medium">{theme.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Language & Region */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Language
                      </label>
                      <select
                        value={settings.preferences.language}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          preferences: { ...prev.preferences, language: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="en">English</option>
                        <option value="sw">Swahili</option>
                        <option value="lg">Luganda</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timezone
                      </label>
                      <select
                        value={settings.preferences.timezone}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          preferences: { ...prev.preferences, timezone: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="UTC">UTC</option>
                        <option value="Africa/Kampala">East Africa Time (EAT)</option>
                        <option value="Africa/Nairobi">East Africa Time (Nairobi)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date Format
                      </label>
                      <select
                        value={settings.preferences.dateFormat}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          preferences: { ...prev.preferences, dateFormat: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Currency
                      </label>
                      <select
                        value={settings.preferences.currency}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          preferences: { ...prev.preferences, currency: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="UGX">Ugandan Shilling (UGX)</option>
                        <option value="USD">US Dollar (USD)</option>
                        <option value="EUR">Euro (EUR)</option>
                      </select>
                    </div>
                  </div>

                  {/* Dashboard Settings */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Dashboard</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Auto Refresh</label>
                          <p className="text-sm text-gray-500">Automatically refresh dashboard data</p>
                        </div>
                        <button
                          onClick={() => setSettings(prev => ({
                            ...prev,
                            preferences: {
                              ...prev.preferences,
                              dashboard: {
                                ...prev.preferences.dashboard,
                                autoRefresh: !prev.preferences.dashboard.autoRefresh
                              }
                            }
                          }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.preferences.dashboard.autoRefresh ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.preferences.dashboard.autoRefresh ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      
                      {settings.preferences.dashboard.autoRefresh && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Refresh Interval (seconds)
                          </label>
                          <input
                            type="number"
                            min="10"
                            max="300"
                            value={settings.preferences.dashboard.refreshInterval}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              preferences: {
                                ...prev.preferences,
                                dashboard: {
                                  ...prev.preferences.dashboard,
                                  refreshInterval: parseInt(e.target.value)
                                }
                              }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Compact Mode</label>
                          <p className="text-sm text-gray-500">Use compact layout for dashboard</p>
                        </div>
                        <button
                          onClick={() => setSettings(prev => ({
                            ...prev,
                            preferences: {
                              ...prev.preferences,
                              dashboard: {
                                ...prev.preferences.dashboard,
                                compactMode: !prev.preferences.dashboard.compactMode
                              }
                            }
                          }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.preferences.dashboard.compactMode ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.preferences.dashboard.compactMode ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Notification Preferences</h2>
                  
                  <div className="space-y-6">
                    {[
                      { key: 'email', label: 'Email Notifications', icon: <Mail className="h-5 w-5" />, desc: 'Receive notifications via email' },
                      { key: 'push', label: 'Push Notifications', icon: <Smartphone className="h-5 w-5" />, desc: 'Receive push notifications on your device' },
                      { key: 'sms', label: 'SMS Notifications', icon: <Phone className="h-5 w-5" />, desc: 'Receive notifications via SMS' },
                      { key: 'desktop', label: 'Desktop Notifications', icon: <Monitor className="h-5 w-5" />, desc: 'Show desktop notifications in browser' }
                    ].map((notification) => (
                      <div key={notification.key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                            {notification.icon}
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">{notification.label}</h3>
                            <p className="text-sm text-gray-500">{notification.desc}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSettings(prev => ({
                            ...prev,
                            preferences: {
                              ...prev.preferences,
                              notifications: {
                                ...prev.preferences.notifications,
                                [notification.key]: !prev.preferences.notifications[notification.key as keyof typeof prev.preferences.notifications]
                              }
                            }
                          }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.preferences.notifications[notification.key as keyof typeof settings.preferences.notifications] ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.preferences.notifications[notification.key as keyof typeof settings.preferences.notifications] ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Security Settings</h2>
                  
                  {/* Password Change */}
                  <div className="mb-6 p-4 border border-gray-200 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Change Password</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Current Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={passwordForm.current}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, current: e.target.value }))}
                            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          New Password
                        </label>
                        <input
                          type="password"
                          value={passwordForm.new}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, new: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={passwordForm.confirm}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <button
                        onClick={handlePasswordChange}
                        disabled={!passwordForm.current || !passwordForm.new || !passwordForm.confirm || saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {saving ? 'Changing...' : 'Change Password'}
                      </button>
                    </div>
                    
                    <div className="mt-3 text-sm text-gray-500">
                      Last changed: {settings.security.passwordLastChanged}
                    </div>
                  </div>

                  {/* Security Options */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-100 rounded-lg text-green-600">
                          <Shield className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h3>
                          <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSettings(prev => ({
                          ...prev,
                          security: { ...prev.security, twoFactorEnabled: !prev.security.twoFactorEnabled }
                        }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.security.twoFactorEnabled ? 'bg-green-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.security.twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                          <Bell className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Login Notifications</h3>
                          <p className="text-sm text-gray-500">Get notified when someone logs into your account</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSettings(prev => ({
                          ...prev,
                          security: { ...prev.security, loginNotifications: !prev.security.loginNotifications }
                        }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.security.loginNotifications ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.security.loginNotifications ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                          <Clock className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Session Timeout</h3>
                          <p className="text-sm text-gray-500">Automatically log out after inactivity</p>
                        </div>
                      </div>
                      <select
                        value={settings.security.sessionTimeout}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          security: { ...prev.security, sessionTimeout: parseInt(e.target.value) }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={60}>1 hour</option>
                        <option value={120}>2 hours</option>
                        <option value={480}>8 hours</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* System Tab (Admin Only) */}
            {activeTab === 'system' && getUserRole() === 'Admin' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">System Settings</h2>
                  
                  <div className="space-y-6">
                    {/* Data Management */}
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Data Management</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Data Retention Period (days)
                          </label>
                          <input
                            type="number"
                            min="30"
                            max="2555"
                            value={settings.system.dataRetention}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              system: { ...prev.system, dataRetention: parseInt(e.target.value) }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Backup Frequency
                          </label>
                          <select
                            value={settings.system.backupFrequency}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              system: { ...prev.system, backupFrequency: e.target.value }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="hourly">Hourly</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* System Options */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                            <Database className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">Audit Logging</h3>
                            <p className="text-sm text-gray-500">Log all system activities for security</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSettings(prev => ({
                            ...prev,
                            system: { ...prev.system, auditLogging: !prev.system.auditLogging }
                          }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.system.auditLogging ? 'bg-purple-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.system.auditLogging ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-green-100 rounded-lg text-green-600">
                            <RefreshCw className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">Performance Mode</h3>
                            <p className="text-sm text-gray-500">Optimize system for better performance</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSettings(prev => ({
                            ...prev,
                            system: { ...prev.system, performanceMode: !prev.system.performanceMode }
                          }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.system.performanceMode ? 'bg-green-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.system.performanceMode ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* System Actions */}
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h3 className="text-lg font-medium text-gray-900 mb-3">System Actions</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button className="flex items-center justify-center space-x-2 p-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                          <Download className="h-4 w-4" />
                          <span>Export Data</span>
                        </button>
                        <button className="flex items-center justify-center space-x-2 p-3 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors">
                          <Upload className="h-4 w-4" />
                          <span>Import Data</span>
                        </button>
                        <button className="flex items-center justify-center space-x-2 p-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                          <Trash2 className="h-4 w-4" />
                          <span>Clear Cache</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 