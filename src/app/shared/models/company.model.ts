export interface ReceiptLetterheadSettings {
  enabled: boolean;
  showLogo: boolean;
  logoUrl?: string | null;
  brandTitle?: string | null;
  brandSubtitle?: string | null;
  headerNote?: string | null;
  contactLine?: string | null;
  extraHeaderLines: string[];
  footerTitle?: string | null;
  footerLines: string[];
}

export interface CompanyProfile {
  _id: string;
  name: string;
  code: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  taxNumber?: string | null;
  logoUrl?: string | null;
  currency?: string | null;
  timezone?: string | null;
  receiptLetterhead?: ReceiptLetterheadSettings;
  isActive: boolean;
}

export interface UpdateCompanyProfilePayload {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  taxNumber?: string;
  logoUrl?: string;
  currency?: string;
  timezone?: string;
  receiptLetterhead?: Partial<ReceiptLetterheadSettings>;
}
