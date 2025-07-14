export const COMPANY_CONFIG = {
  // Company Identity
  name: "UNISON TECHNOLOGIES AN INNOVATIONS LIMITED",
  subtitle: "equity shoppers supermarket",
  shortName: "Unison Technologies",
  
  // Contact Information
  email: "info@unison-technologies.com",
  phone: "+256 XXX XXX XXX", // Update with actual phone
  website: "https://unison-technologies.com",
  
  // Address
  address: {
    street: "", // Update with actual address
    city: "", // Update with actual city
    country: "Uganda",
    postalCode: ""
  },
  
  // Branding
  colors: {
    primary: "#6B46C1", // Purple
    secondary: "#667eea", // Blue
    accent: "#764ba2"
  },
  
  // Business Details
  registration: {
    number: "", // Company registration number
    tin: "", // Tax identification number
    vat: "" // VAT number if applicable
  },
  
  // ID Card Settings
  idCard: {
    companyNameFontSize: "11px",
    subtitleFontSize: "10px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    textColor: "white",
    photoSection: {
      width: "70px",
      height: "85px",
      placeholder: "PHOTO",
      borderStyle: "dashed",
      borderColor: "rgba(255, 255, 255, 0.5)"
    }
  },
  
  // Default Settings
  currency: "UGX",
  timezone: "Africa/Kampala",
  dateFormat: "DD/MM/YYYY",
  
  // Features
  features: {
    multiLocation: true,
    inventory: true,
    hr: true,
    accounting: true,
    reports: true
  }
} as const;

// Utility functions for company information
export const getCompanyDisplayName = () => COMPANY_CONFIG.name;
export const getCompanySubtitle = () => COMPANY_CONFIG.subtitle;
export const getCompanyShortName = () => COMPANY_CONFIG.shortName;
export const getCompanyWebsite = () => COMPANY_CONFIG.website;
export const getCompanyEmail = () => COMPANY_CONFIG.email;
export const getCompanyPhone = () => COMPANY_CONFIG.phone;

// Format company name for different contexts
export const formatCompanyNameForId = () => ({
  name: COMPANY_CONFIG.name,
  subtitle: COMPANY_CONFIG.subtitle
});

export const formatCompanyAddress = () => {
  const { street, city, country, postalCode } = COMPANY_CONFIG.address;
  return [street, city, country, postalCode].filter(Boolean).join(", ");
}; 