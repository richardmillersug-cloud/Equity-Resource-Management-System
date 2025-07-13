# Translation System Guide

## Overview

This application now supports bilingual functionality with English and Luganda translations. Users can switch between languages at any time using the language switcher in the sidebar.

## Features

- **Real-time language switching**: Users can change the language without page refresh
- **Persistent language selection**: The selected language is saved to localStorage
- **Fallback support**: If a translation is missing, it falls back to English or the provided fallback text
- **Easy integration**: Simple `useLanguage` hook for components

## Quick Start

### 1. Using Translations in Components

```typescript
import { useLanguage } from '../contexts/LanguageContext';

const MyComponent = () => {
  const { t, locale, setLocale } = useLanguage();

  return (
    <div>
      <h1>{t('navigation.dashboard', 'Dashboard')}</h1>
      <button>{t('actions.save', 'Save')}</button>
      <p>{t('messages.welcomeMessage', 'Welcome to Equity Shopper\'s Supermarket')}</p>
    </div>
  );
};
```

### 2. Translation Keys Structure

The translation keys follow a nested structure:

```typescript
// Navigation items
t('navigation.dashboard') // "Dashboard" / "Ekyuma Ekinene"
t('navigation.suppliers') // "Suppliers" / "Abatundisi"

// Actions
t('actions.save') // "Save" / "Kuuma"
t('actions.cancel') // "Cancel" / "Sazaamu"

// Status
t('status.active') // "Active" / "Mukola"
t('status.pending') // "Pending" / "Kirindiirwa"

// Forms
t('forms.firstName') // "First Name" / "Erinnya Erisooka"
t('forms.email') // "Email" / "Esimeyili"

// Messages
t('messages.dataUpdated') // "Data updated successfully" / "Amakulu gakyusiddwa obulungi"
```

### 3. Language Switcher

The language switcher is automatically available in the sidebar. Users can:
- Click the language button to open the dropdown
- Select between English and Luganda
- See the current language highlighted with a checkmark

## Available Translation Categories

### Navigation
- Dashboard, PM Dashboard, System Overview, User Management, etc.
- All main navigation items are translated

### Actions
- Common actions like Add, Edit, Delete, Save, Cancel, etc.
- All interactive elements have translations

### Status
- Active, Inactive, Pending, Approved, Rejected, etc.
- All status indicators are translated

### Forms
- Form field labels and placeholders
- Validation messages and form elements

### Messages
- System messages, alerts, and notifications
- User feedback messages

### Time
- Time-related terms like Today, Yesterday, This Week, etc.

### Common
- General terms used throughout the application

## Adding New Translations

### 1. Add to English file (`public/locales/en/common.json`)

```json
{
  "newSection": {
    "newKey": "New English Text"
  }
}
```

### 2. Add to Luganda file (`public/locales/lg/common.json`)

```json
{
  "newSection": {
    "newKey": "Ebigambo Ebipya mu Luganda"
  }
}
```

### 3. Use in component

```typescript
const text = t('newSection.newKey', 'Fallback text');
```

## Best Practices

### 1. Always provide fallback text
```typescript
// Good
t('actions.save', 'Save')

// Avoid
t('actions.save')
```

### 2. Use semantic key names
```typescript
// Good
t('forms.firstName', 'First Name')

// Avoid
t('label1', 'First Name')
```

### 3. Group related translations
```typescript
// Good structure
{
  "forms": {
    "firstName": "First Name",
    "lastName": "Last Name"
  },
  "actions": {
    "save": "Save",
    "cancel": "Cancel"
  }
}
```

### 4. Handle pluralization
```typescript
// For complex pluralization, you might need different keys
t('items.count', `${count} items`)
```

## Language Codes

- `en` - English
- `lg` - Luganda

## File Structure

```
public/
  locales/
    en/
      common.json    # English translations
    lg/
      common.json    # Luganda translations
```

## Configuration Files

- `next.config.ts` - Next.js i18n configuration
- `next-i18next.config.js` - i18next configuration
- `src/contexts/LanguageContext.tsx` - React context for language management
- `src/components/ui/LanguageSwitcher.tsx` - Language switcher component

## Example Component Usage

See `src/components/examples/TranslationExample.tsx` for a complete example of how to use translations in a component.

## Technical Details

### Context Provider
The `LanguageProvider` wraps the entire application and provides:
- Current locale state
- Translation function `t()`
- Language switching function `setLocale()`
- Loading state for translations

### Translation Function
The `t()` function accepts:
- `key`: Translation key (e.g., 'navigation.dashboard')
- `fallback`: Fallback text if translation is missing

### Storage
The selected language is persisted in localStorage and automatically restored on page refresh.

## Troubleshooting

### Translation not showing
1. Check if the key exists in both language files
2. Verify the key path is correct
3. Ensure fallback text is provided
4. Check browser console for errors

### Language not switching
1. Verify the language switcher is properly imported
2. Check if the LanguageProvider wraps your component
3. Ensure localStorage is available in the browser

### Missing translations
1. Add missing keys to both language files
2. Restart the development server
3. Clear browser cache if necessary

## Contributing Translations

When adding new features:
1. Add English translations first
2. Add corresponding Luganda translations
3. Test both languages work correctly
4. Update this guide if adding new categories

## Future Enhancements

- Add more languages (Swahili, French, etc.)
- Implement RTL language support
- Add translation management tools
- Implement lazy loading for translation files
- Add pluralization support
- Add number and date formatting

---

For questions or issues with the translation system, please contact the development team. 