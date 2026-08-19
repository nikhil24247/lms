import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface CompanyOption {
  id: string;
  name: string;
  slug: string;
}

interface CompanyContextValue {
  activeCompanyId: string | null;
  activeCompany: CompanyOption | null;
  setActiveCompany: (company: CompanyOption | null) => void;
  isGlobalView: boolean;
}

const CompanyContext = createContext<CompanyContextValue | null>(null);

const STORAGE_KEY = 'lms_company_context';
const STORAGE_NAME_KEY = 'lms_company_context_name';
const STORAGE_SLUG_KEY = 'lms_company_context_slug';

export function CompanyProvider({
  children,
  userRole,
  userCompany,
}: {
  children: ReactNode;
  userRole?: string;
  userCompany?: CompanyOption | null;
}) {
  const [activeCompany, setActiveCompanyState] = useState<CompanyOption | null>(() => {
    if (userRole === 'LMS_ADMIN' && userCompany) return userCompany;
    const id = localStorage.getItem(STORAGE_KEY);
    const name = localStorage.getItem(STORAGE_NAME_KEY);
    const slug = localStorage.getItem(STORAGE_SLUG_KEY);
    if (id && name) return { id, name, slug: slug ?? '' };
    return null;
  });

  useEffect(() => {
    if (userRole === 'LMS_ADMIN' && userCompany) {
      setActiveCompanyState(userCompany);
      localStorage.setItem(STORAGE_KEY, userCompany.id);
      localStorage.setItem(STORAGE_NAME_KEY, userCompany.name);
      localStorage.setItem(STORAGE_SLUG_KEY, userCompany.slug);
    }
  }, [userRole, userCompany]);

  const setActiveCompany = (company: CompanyOption | null) => {
    setActiveCompanyState(company);
    if (company) {
      localStorage.setItem(STORAGE_KEY, company.id);
      localStorage.setItem(STORAGE_NAME_KEY, company.name);
      localStorage.setItem(STORAGE_SLUG_KEY, company.slug);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_NAME_KEY);
      localStorage.removeItem(STORAGE_SLUG_KEY);
    }
  };

  return (
    <CompanyContext.Provider
      value={{
        activeCompanyId: activeCompany?.id ?? null,
        activeCompany,
        setActiveCompany,
        isGlobalView: userRole === 'SYSTEM_ADMIN' && !activeCompany,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompanyContext() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error('useCompanyContext must be used within CompanyProvider');
  return ctx;
}
