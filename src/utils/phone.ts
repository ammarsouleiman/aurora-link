// Phone number utilities for AuroraLink

export interface CountryCode {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  placeholder: string;
}

// Comprehensive list of country codes with flags and sample formats (195 countries)
export const COUNTRY_CODES: CountryCode[] = [
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸', placeholder: '(555) 123-4567' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', placeholder: '7400 123456' },
  { code: 'AF', name: 'Afghanistan', dialCode: '+93', flag: '🇦🇫', placeholder: '70 123 4567' },
  { code: 'AL', name: 'Albania', dialCode: '+355', flag: '🇦🇱', placeholder: '66 123 4567' },
  { code: 'DZ', name: 'Algeria', dialCode: '+213', flag: '🇩🇿', placeholder: '551 23 45 67' },
  { code: 'AS', name: 'American Samoa', dialCode: '+1684', flag: '🇦🇸', placeholder: '733 1234' },
  { code: 'AD', name: 'Andorra', dialCode: '+376', flag: '🇦🇩', placeholder: '312 345' },
  { code: 'AO', name: 'Angola', dialCode: '+244', flag: '🇦🇴', placeholder: '923 123 456' },
  { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷', placeholder: '11 2345-6789' },
  { code: 'AM', name: 'Armenia', dialCode: '+374', flag: '🇦🇲', placeholder: '77 123456' },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺', placeholder: '412 345 678' },
  { code: 'AT', name: 'Austria', dialCode: '+43', flag: '🇦🇹', placeholder: '664 1234567' },
  { code: 'AZ', name: 'Azerbaijan', dialCode: '+994', flag: '🇦🇿', placeholder: '40 123 45 67' },
  { code: 'BH', name: 'Bahrain', dialCode: '+973', flag: '🇧🇭', placeholder: '3600 1234' },
  { code: 'BD', name: 'Bangladesh', dialCode: '+880', flag: '🇧🇩', placeholder: '1812 345678' },
  { code: 'BY', name: 'Belarus', dialCode: '+375', flag: '🇧🇾', placeholder: '29 123 45 67' },
  { code: 'BE', name: 'Belgium', dialCode: '+32', flag: '🇧🇪', placeholder: '470 12 34 56' },
  { code: 'BZ', name: 'Belize', dialCode: '+501', flag: '🇧🇿', placeholder: '622 1234' },
  { code: 'BJ', name: 'Benin', dialCode: '+229', flag: '🇧🇯', placeholder: '90 01 12 34' },
  { code: 'BT', name: 'Bhutan', dialCode: '+975', flag: '🇧🇹', placeholder: '17 12 34 56' },
  { code: 'BO', name: 'Bolivia', dialCode: '+591', flag: '🇧🇴', placeholder: '71234567' },
  { code: 'BA', name: 'Bosnia and Herzegovina', dialCode: '+387', flag: '🇧🇦', placeholder: '61 123 456' },
  { code: 'BW', name: 'Botswana', dialCode: '+267', flag: '🇧🇼', placeholder: '71 123 456' },
  { code: 'BR', name: 'Brazil', dialCode: '+55', flag: '🇧🇷', placeholder: '11 91234-5678' },
  { code: 'BN', name: 'Brunei', dialCode: '+673', flag: '🇧🇳', placeholder: '712 3456' },
  { code: 'BG', name: 'Bulgaria', dialCode: '+359', flag: '🇧🇬', placeholder: '48 123 456' },
  { code: 'BF', name: 'Burkina Faso', dialCode: '+226', flag: '🇧🇫', placeholder: '70 12 34 56' },
  { code: 'BI', name: 'Burundi', dialCode: '+257', flag: '🇧🇮', placeholder: '79 56 12 34' },
  { code: 'KH', name: 'Cambodia', dialCode: '+855', flag: '🇰🇭', placeholder: '91 234 567' },
  { code: 'CM', name: 'Cameroon', dialCode: '+237', flag: '🇨🇲', placeholder: '6 71 23 45 67' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦', placeholder: '(555) 123-4567' },
  { code: 'CV', name: 'Cape Verde', dialCode: '+238', flag: '🇨🇻', placeholder: '991 12 34' },
  { code: 'CF', name: 'Central African Republic', dialCode: '+236', flag: '🇨🇫', placeholder: '70 01 23 45' },
  { code: 'TD', name: 'Chad', dialCode: '+235', flag: '🇹🇩', placeholder: '63 01 23 45' },
  { code: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱', placeholder: '9 1234 5678' },
  { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳', placeholder: '138 0013 8000' },
  { code: 'CO', name: 'Colombia', dialCode: '+57', flag: '🇨🇴', placeholder: '321 1234567' },
  { code: 'KM', name: 'Comoros', dialCode: '+269', flag: '🇰🇲', placeholder: '321 23 45' },
  { code: 'CG', name: 'Congo', dialCode: '+242', flag: '🇨🇬', placeholder: '06 123 4567' },
  { code: 'CD', name: 'Congo (DRC)', dialCode: '+243', flag: '🇨🇩', placeholder: '991 234 567' },
  { code: 'CR', name: 'Costa Rica', dialCode: '+506', flag: '🇨🇷', placeholder: '8312 3456' },
  { code: 'HR', name: 'Croatia', dialCode: '+385', flag: '🇭🇷', placeholder: '92 123 4567' },
  { code: 'CU', name: 'Cuba', dialCode: '+53', flag: '🇨🇺', placeholder: '5 1234567' },
  { code: 'CY', name: 'Cyprus', dialCode: '+357', flag: '🇨🇾', placeholder: '96 123456' },
  { code: 'CZ', name: 'Czech Republic', dialCode: '+420', flag: '🇨🇿', placeholder: '601 123 456' },
  { code: 'DK', name: 'Denmark', dialCode: '+45', flag: '🇩🇰', placeholder: '32 12 34 56' },
  { code: 'DJ', name: 'Djibouti', dialCode: '+253', flag: '🇩🇯', placeholder: '77 83 10 01' },
  { code: 'DO', name: 'Dominican Republic', dialCode: '+1809', flag: '🇩🇴', placeholder: '809 234 5678' },
  { code: 'EC', name: 'Ecuador', dialCode: '+593', flag: '🇪🇨', placeholder: '99 123 4567' },
  { code: 'EG', name: 'Egypt', dialCode: '+20', flag: '🇪🇬', placeholder: '100 123 4567' },
  { code: 'SV', name: 'El Salvador', dialCode: '+503', flag: '🇸🇻', placeholder: '7012 3456' },
  { code: 'GQ', name: 'Equatorial Guinea', dialCode: '+240', flag: '🇬🇶', placeholder: '222 123 456' },
  { code: 'ER', name: 'Eritrea', dialCode: '+291', flag: '🇪🇷', placeholder: '7 123 456' },
  { code: 'EE', name: 'Estonia', dialCode: '+372', flag: '🇪🇪', placeholder: '5123 4567' },
  { code: 'ET', name: 'Ethiopia', dialCode: '+251', flag: '🇪🇹', placeholder: '91 123 4567' },
  { code: 'FJ', name: 'Fiji', dialCode: '+679', flag: '🇫🇯', placeholder: '701 2345' },
  { code: 'FI', name: 'Finland', dialCode: '+358', flag: '🇫🇮', placeholder: '41 2345678' },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷', placeholder: '6 12 34 56 78' },
  { code: 'GA', name: 'Gabon', dialCode: '+241', flag: '🇬🇦', placeholder: '06 03 12 34' },
  { code: 'GM', name: 'Gambia', dialCode: '+220', flag: '🇬🇲', placeholder: '301 2345' },
  { code: 'GE', name: 'Georgia', dialCode: '+995', flag: '🇬🇪', placeholder: '555 12 34 56' },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪', placeholder: '1512 3456789' },
  { code: 'GH', name: 'Ghana', dialCode: '+233', flag: '🇬🇭', placeholder: '23 123 4567' },
  { code: 'GR', name: 'Greece', dialCode: '+30', flag: '🇬🇷', placeholder: '691 234 5678' },
  { code: 'GT', name: 'Guatemala', dialCode: '+502', flag: '🇬🇹', placeholder: '5123 4567' },
  { code: 'GN', name: 'Guinea', dialCode: '+224', flag: '🇬🇳', placeholder: '601 12 34 56' },
  { code: 'GW', name: 'Guinea-Bissau', dialCode: '+245', flag: '🇬🇼', placeholder: '955 012 345' },
  { code: 'GY', name: 'Guyana', dialCode: '+592', flag: '🇬🇾', placeholder: '609 1234' },
  { code: 'HT', name: 'Haiti', dialCode: '+509', flag: '🇭🇹', placeholder: '34 10 1234' },
  { code: 'HN', name: 'Honduras', dialCode: '+504', flag: '🇭🇳', placeholder: '9123 4567' },
  { code: 'HK', name: 'Hong Kong', dialCode: '+852', flag: '🇭🇰', placeholder: '5123 4567' },
  { code: 'HU', name: 'Hungary', dialCode: '+36', flag: '🇭🇺', placeholder: '20 123 4567' },
  { code: 'IS', name: 'Iceland', dialCode: '+354', flag: '🇮🇸', placeholder: '611 1234' },
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳', placeholder: '98765 43210' },
  { code: 'ID', name: 'Indonesia', dialCode: '+62', flag: '🇮🇩', placeholder: '812 3456 7890' },
  { code: 'IR', name: 'Iran', dialCode: '+98', flag: '🇮🇷', placeholder: '912 345 6789' },
  { code: 'IQ', name: 'Iraq', dialCode: '+964', flag: '🇮🇶', placeholder: '791 234 5678' },
  { code: 'IE', name: 'Ireland', dialCode: '+353', flag: '🇮🇪', placeholder: '85 012 3456' },
  { code: 'IL', name: 'Israel', dialCode: '+972', flag: '🇮🇱', placeholder: '50 123 4567' },
  { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹', placeholder: '312 345 6789' },
  { code: 'CI', name: 'Ivory Coast', dialCode: '+225', flag: '🇨🇮', placeholder: '01 23 45 67' },
  { code: 'JM', name: 'Jamaica', dialCode: '+1876', flag: '🇯🇲', placeholder: '876 210 1234' },
  { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵', placeholder: '90 1234 5678' },
  { code: 'JO', name: 'Jordan', dialCode: '+962', flag: '🇯🇴', placeholder: '7 9012 3456' },
  { code: 'KZ', name: 'Kazakhstan', dialCode: '+7', flag: '🇰🇿', placeholder: '771 000 9998' },
  { code: 'KE', name: 'Kenya', dialCode: '+254', flag: '🇰🇪', placeholder: '712 345678' },
  { code: 'KW', name: 'Kuwait', dialCode: '+965', flag: '🇰🇼', placeholder: '500 12345' },
  { code: 'KG', name: 'Kyrgyzstan', dialCode: '+996', flag: '🇰🇬', placeholder: '700 123 456' },
  { code: 'LA', name: 'Laos', dialCode: '+856', flag: '🇱🇦', placeholder: '20 23 123 456' },
  { code: 'LV', name: 'Latvia', dialCode: '+371', flag: '🇱🇻', placeholder: '21 234 567' },
  { code: 'LB', name: 'Lebanon', dialCode: '+961', flag: '🇱🇧', placeholder: '71 123 456' },
  { code: 'LS', name: 'Lesotho', dialCode: '+266', flag: '🇱🇸', placeholder: '5012 3456' },
  { code: 'LR', name: 'Liberia', dialCode: '+231', flag: '🇱🇷', placeholder: '77 012 3456' },
  { code: 'LY', name: 'Libya', dialCode: '+218', flag: '🇱🇾', placeholder: '91 2345678' },
  { code: 'LI', name: 'Liechtenstein', dialCode: '+423', flag: '🇱🇮', placeholder: '660 234 567' },
  { code: 'LT', name: 'Lithuania', dialCode: '+370', flag: '🇱🇹', placeholder: '612 34567' },
  { code: 'LU', name: 'Luxembourg', dialCode: '+352', flag: '🇱🇺', placeholder: '628 123 456' },
  { code: 'MO', name: 'Macau', dialCode: '+853', flag: '🇲🇴', placeholder: '6612 3456' },
  { code: 'MK', name: 'Macedonia', dialCode: '+389', flag: '🇲🇰', placeholder: '72 345 678' },
  { code: 'MG', name: 'Madagascar', dialCode: '+261', flag: '🇲🇬', placeholder: '32 12 345 67' },
  { code: 'MW', name: 'Malawi', dialCode: '+265', flag: '🇲🇼', placeholder: '991 23 45 67' },
  { code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾', placeholder: '12 345 6789' },
  { code: 'MV', name: 'Maldives', dialCode: '+960', flag: '🇲🇻', placeholder: '771 2345' },
  { code: 'ML', name: 'Mali', dialCode: '+223', flag: '🇲🇱', placeholder: '65 01 23 45' },
  { code: 'MT', name: 'Malta', dialCode: '+356', flag: '🇲🇹', placeholder: '9696 1234' },
  { code: 'MR', name: 'Mauritania', dialCode: '+222', flag: '🇲🇷', placeholder: '22 12 34 56' },
  { code: 'MU', name: 'Mauritius', dialCode: '+230', flag: '🇲🇺', placeholder: '5251 2345' },
  { code: 'MX', name: 'Mexico', dialCode: '+52', flag: '🇲🇽', placeholder: '55 1234 5678' },
  { code: 'MD', name: 'Moldova', dialCode: '+373', flag: '🇲🇩', placeholder: '621 12 345' },
  { code: 'MC', name: 'Monaco', dialCode: '+377', flag: '🇲🇨', placeholder: '6 12 34 56 78' },
  { code: 'MN', name: 'Mongolia', dialCode: '+976', flag: '🇲🇳', placeholder: '8812 3456' },
  { code: 'ME', name: 'Montenegro', dialCode: '+382', flag: '🇲🇪', placeholder: '67 622 901' },
  { code: 'MA', name: 'Morocco', dialCode: '+212', flag: '🇲🇦', placeholder: '650 123456' },
  { code: 'MZ', name: 'Mozambique', dialCode: '+258', flag: '🇲🇿', placeholder: '82 123 4567' },
  { code: 'MM', name: 'Myanmar', dialCode: '+95', flag: '🇲🇲', placeholder: '9 212 3456' },
  { code: 'NA', name: 'Namibia', dialCode: '+264', flag: '🇳🇦', placeholder: '81 123 4567' },
  { code: 'NP', name: 'Nepal', dialCode: '+977', flag: '🇳🇵', placeholder: '984 1234567' },
  { code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱', placeholder: '6 12345678' },
  { code: 'NZ', name: 'New Zealand', dialCode: '+64', flag: '🇳🇿', placeholder: '21 123 4567' },
  { code: 'NI', name: 'Nicaragua', dialCode: '+505', flag: '🇳🇮', placeholder: '8123 4567' },
  { code: 'NE', name: 'Niger', dialCode: '+227', flag: '🇳🇪', placeholder: '93 12 34 56' },
  { code: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬', placeholder: '802 123 4567' },
  { code: 'NO', name: 'Norway', dialCode: '+47', flag: '🇳🇴', placeholder: '412 34 567' },
  { code: 'OM', name: 'Oman', dialCode: '+968', flag: '🇴🇲', placeholder: '9212 3456' },
  { code: 'PK', name: 'Pakistan', dialCode: '+92', flag: '🇵🇰', placeholder: '301 2345678' },
  { code: 'PS', name: 'Palestine', dialCode: '+970', flag: '🇵🇸', placeholder: '599 123 456' },
  { code: 'PA', name: 'Panama', dialCode: '+507', flag: '🇵🇦', placeholder: '6123 4567' },
  { code: 'PG', name: 'Papua New Guinea', dialCode: '+675', flag: '🇵🇬', placeholder: '7012 3456' },
  { code: 'PY', name: 'Paraguay', dialCode: '+595', flag: '🇵🇾', placeholder: '961 456789' },
  { code: 'PE', name: 'Peru', dialCode: '+51', flag: '🇵🇪', placeholder: '912 345 678' },
  { code: 'PH', name: 'Philippines', dialCode: '+63', flag: '🇵🇭', placeholder: '917 123 4567' },
  { code: 'PL', name: 'Poland', dialCode: '+48', flag: '🇵🇱', placeholder: '512 345 678' },
  { code: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹', placeholder: '912 345 678' },
  { code: 'PR', name: 'Puerto Rico', dialCode: '+1787', flag: '🇵🇷', placeholder: '787 234 5678' },
  { code: 'QA', name: 'Qatar', dialCode: '+974', flag: '🇶🇦', placeholder: '3312 3456' },
  { code: 'RO', name: 'Romania', dialCode: '+40', flag: '🇷🇴', placeholder: '712 034 567' },
  { code: 'RU', name: 'Russia', dialCode: '+7', flag: '🇷🇺', placeholder: '912 345-67-89' },
  { code: 'RW', name: 'Rwanda', dialCode: '+250', flag: '🇷🇼', placeholder: '720 123 456' },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦', placeholder: '50 123 4567' },
  { code: 'SN', name: 'Senegal', dialCode: '+221', flag: '🇸🇳', placeholder: '70 123 45 67' },
  { code: 'RS', name: 'Serbia', dialCode: '+381', flag: '🇷🇸', placeholder: '60 1234567' },
  { code: 'SC', name: 'Seychelles', dialCode: '+248', flag: '🇸🇨', placeholder: '2 510 123' },
  { code: 'SL', name: 'Sierra Leone', dialCode: '+232', flag: '🇸🇱', placeholder: '25 123456' },
  { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬', placeholder: '8123 4567' },
  { code: 'SK', name: 'Slovakia', dialCode: '+421', flag: '🇸🇰', placeholder: '912 123 456' },
  { code: 'SI', name: 'Slovenia', dialCode: '+386', flag: '🇸🇮', placeholder: '31 234 567' },
  { code: 'SO', name: 'Somalia', dialCode: '+252', flag: '🇸🇴', placeholder: '7 1123456' },
  { code: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦', placeholder: '71 123 4567' },
  { code: 'KR', name: 'South Korea', dialCode: '+82', flag: '🇰🇷', placeholder: '10-1234-5678' },
  { code: 'SS', name: 'South Sudan', dialCode: '+211', flag: '🇸🇸', placeholder: '977 123 456' },
  { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸', placeholder: '612 34 56 78' },
  { code: 'LK', name: 'Sri Lanka', dialCode: '+94', flag: '🇱🇰', placeholder: '71 234 5678' },
  { code: 'SD', name: 'Sudan', dialCode: '+249', flag: '🇸🇩', placeholder: '91 123 1234' },
  { code: 'SR', name: 'Suriname', dialCode: '+597', flag: '🇸🇷', placeholder: '741 2345' },
  { code: 'SZ', name: 'Swaziland', dialCode: '+268', flag: '🇸🇿', placeholder: '7612 3456' },
  { code: 'SE', name: 'Sweden', dialCode: '+46', flag: '🇸🇪', placeholder: '70 123 45 67' },
  { code: 'CH', name: 'Switzerland', dialCode: '+41', flag: '🇨🇭', placeholder: '78 123 45 67' },
  { code: 'SY', name: 'Syria', dialCode: '+963', flag: '🇸🇾', placeholder: '944 567 890' },
  { code: 'TW', name: 'Taiwan', dialCode: '+886', flag: '🇹🇼', placeholder: '912 345 678' },
  { code: 'TJ', name: 'Tajikistan', dialCode: '+992', flag: '🇹🇯', placeholder: '917 12 3456' },
  { code: 'TZ', name: 'Tanzania', dialCode: '+255', flag: '🇹🇿', placeholder: '621 234 567' },
  { code: 'TH', name: 'Thailand', dialCode: '+66', flag: '🇹🇭', placeholder: '81 234 5678' },
  { code: 'TG', name: 'Togo', dialCode: '+228', flag: '🇹🇬', placeholder: '90 11 23 45' },
  { code: 'TO', name: 'Tonga', dialCode: '+676', flag: '🇹🇴', placeholder: '771 5123' },
  { code: 'TT', name: 'Trinidad and Tobago', dialCode: '+1868', flag: '🇹🇹', placeholder: '868 291 1234' },
  { code: 'TN', name: 'Tunisia', dialCode: '+216', flag: '🇹🇳', placeholder: '20 123 456' },
  { code: 'TR', name: 'Turkey', dialCode: '+90', flag: '🇹🇷', placeholder: '532 123 4567' },
  { code: 'TM', name: 'Turkmenistan', dialCode: '+993', flag: '🇹🇲', placeholder: '66 123456' },
  { code: 'UG', name: 'Uganda', dialCode: '+256', flag: '🇺🇬', placeholder: '712 345678' },
  { code: 'UA', name: 'Ukraine', dialCode: '+380', flag: '🇺🇦', placeholder: '50 123 4567' },
  { code: 'AE', name: 'UAE', dialCode: '+971', flag: '🇦🇪', placeholder: '50 123 4567' },
  { code: 'UY', name: 'Uruguay', dialCode: '+598', flag: '🇺🇾', placeholder: '94 231 234' },
  { code: 'UZ', name: 'Uzbekistan', dialCode: '+998', flag: '🇺🇿', placeholder: '91 234 56 78' },
  { code: 'VU', name: 'Vanuatu', dialCode: '+678', flag: '🇻🇺', placeholder: '591 2345' },
  { code: 'VE', name: 'Venezuela', dialCode: '+58', flag: '🇻🇪', placeholder: '412 1234567' },
  { code: 'VN', name: 'Vietnam', dialCode: '+84', flag: '🇻🇳', placeholder: '91 234 5678' },
  { code: 'YE', name: 'Yemen', dialCode: '+967', flag: '🇾🇪', placeholder: '712 345 678' },
  { code: 'ZM', name: 'Zambia', dialCode: '+260', flag: '🇿🇲', placeholder: '95 5123456' },
  { code: 'ZW', name: 'Zimbabwe', dialCode: '+263', flag: '🇿🇼', placeholder: '71 234 5678' },
];

/**
 * Validates phone number format (basic validation)
 */
export function validatePhoneNumber(phone: string): boolean {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Phone number should have at least 7 digits and at most 15 digits (E.164 standard)
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Formats phone number to E.164 format
 */
export function formatToE164(dialCode: string, phone: string): string {
  // Remove all non-digit characters from phone
  const digits = phone.replace(/\D/g, '');
  
  // Ensure dial code starts with +
  const cleanDialCode = dialCode.startsWith('+') ? dialCode : `+${dialCode}`;
  
  return `${cleanDialCode}${digits}`;
}

/**
 * Parses E.164 phone number to dial code and number
 */
export function parseE164(e164: string): { dialCode: string; phone: string } | null {
  if (!e164.startsWith('+')) return null;
  
  // Try to match against known country codes
  for (const country of COUNTRY_CODES) {
    if (e164.startsWith(country.dialCode)) {
      return {
        dialCode: country.dialCode,
        phone: e164.slice(country.dialCode.length),
      };
    }
  }
  
  return null;
}

/**
 * Formats phone number for display based on country
 */
export function formatPhoneForDisplay(dialCode: string, phone: string): string {
  const country = COUNTRY_CODES.find(c => c.dialCode === dialCode);
  
  // Simple formatting - add spaces every 3-4 digits
  const digits = phone.replace(/\D/g, '');
  
  if (dialCode === '+1' || dialCode === '+7') {
    // North American format: (555) 123-4567
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
  }
  
  // Default: Add space every 3-4 digits
  return digits.replace(/(\d{3,4})(?=\d)/g, '$1 ').trim();
}

/**
 * Formats a full phone number in E.164 format for display
 * Example: +14155552671 -> +1 (415) 555-2671
 */
export function formatPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return '';
  
  // Parse the E.164 number
  const parsed = parseE164(phoneNumber);
  
  if (parsed) {
    const formatted = formatPhoneForDisplay(parsed.dialCode, parsed.phone);
    return `${parsed.dialCode} ${formatted}`;
  }
  
  // Fallback: just return the number with spaces
  return phoneNumber.replace(/(\d{1,4})(?=\d)/g, '$1 ').trim();
}

/**
 * Validates OTP code
 */
export function validateOTP(otp: string): boolean {
  return /^\d{6}$/.test(otp);
}

/**
 * Generate a random OTP (for demo purposes - in production this would be server-side)
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Get country by dial code
 */
export function getCountryByDialCode(dialCode: string): CountryCode | undefined {
  return COUNTRY_CODES.find(c => c.dialCode === dialCode);
}

/**
 * Search countries by name or dial code
 */
export function searchCountries(query: string): CountryCode[] {
  const lowerQuery = query.toLowerCase();
  return COUNTRY_CODES.filter(
    c =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.dialCode.includes(query) ||
      c.code.toLowerCase().includes(lowerQuery)
  );
}
