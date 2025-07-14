'use client';

import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Save, Cancel, Search, Filter, Export, Print } from 'lucide-react';

// Example component demonstrating how to use translations
export const TranslationExample: React.FC = () => {
  const { t, locale } = useLanguage();

  const handleSave = () => {
    alert(t('messages.dataUpdated', 'Data updated successfully'));
  };

  const handleCancel = () => {
    const confirmed = confirm(t('messages.unsavedChanges', 'You have unsaved changes. Are you sure you want to leave?'));
    if (confirmed) {
      alert(t('actions.cancel', 'Cancel'));
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl font-semibold mb-4">
        {t('messages.welcomeMessage', 'Welcome to Equity Shopper\'s Supermarket')}
      </h2>
      
      <p className="text-gray-600 mb-6">
        {t('common.language', 'Language')}: {t('common.english', 'English')} / {t('common.luganda', 'Luganda')}
      </p>

      {/* Form Example */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('forms.firstName', 'First Name')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder={t('forms.firstName', 'First Name')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('forms.email', 'Email')} <span className="text-gray-400">({t('forms.optional', 'Optional')})</span>
          </label>
          <input
            type="email"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder={t('forms.email', 'Email')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('forms.status', 'Status')}
          </label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent">
            <option value="active">{t('status.active', 'Active')}</option>
            <option value="inactive">{t('status.inactive', 'Inactive')}</option>
            <option value="pending">{t('status.pending', 'Pending')}</option>
          </select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mt-6">
        <button
          onClick={handleSave}
          className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Save className="w-4 h-4 mr-2" />
          {t('actions.save', 'Save')}
        </button>

        <button
          onClick={handleCancel}
          className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Cancel className="w-4 h-4 mr-2" />
          {t('actions.cancel', 'Cancel')}
        </button>

        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Search className="w-4 h-4 mr-2" />
          {t('actions.search', 'Search')}
        </button>

        <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
          <Filter className="w-4 h-4 mr-2" />
          {t('actions.filter', 'Filter')}
        </button>

        <button className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
          <Export className="w-4 h-4 mr-2" />
          {t('actions.export', 'Export')}
        </button>

        <button className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          <Print className="w-4 h-4 mr-2" />
          {t('actions.print', 'Print')}
        </button>
      </div>

      {/* Status Examples */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-3">
          {t('status.status', 'Status')} {t('common.examples', 'Examples')}
        </h3>
        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
            {t('status.approved', 'Approved')}
          </span>
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
            {t('status.pending', 'Pending')}
          </span>
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm">
            {t('status.rejected', 'Rejected')}
          </span>
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
            {t('status.processing', 'Processing')}
          </span>
        </div>
      </div>

      {/* Time Examples */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-3">
          {t('time.time', 'Time')} {t('common.examples', 'Examples')}
        </h3>
        <div className="space-y-1 text-sm text-gray-600">
          <p>{t('time.today', 'Today')}</p>
          <p>{t('time.yesterday', 'Yesterday')}</p>
          <p>{t('time.thisWeek', 'This Week')}</p>
          <p>{t('time.thisMonth', 'This Month')}</p>
        </div>
      </div>

      {/* Current Language Display */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>{t('common.language', 'Language')}:</strong> {locale === 'en' ? t('common.english', 'English') : t('common.luganda', 'Luganda')}
        </p>
      </div>
    </div>
  );
};

export default TranslationExample; 