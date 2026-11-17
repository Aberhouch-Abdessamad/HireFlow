import { SwapOutlined } from '@ant-design/icons';
import { App, Select } from 'antd';
import { useNavigate } from 'react-router';
import { useMyCompanies, useSwitchCompany } from '@/features/auth/queries';
import type { AuthUser } from '@/features/auth/types';
import { toApiError } from '@/services/apiError';

/** Company picker. Hidden for users who belong to a single company. */
export function CompanySwitcher({ user }: { user: AuthUser }) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const companies = useMyCompanies(true);
  const switchCompany = useSwitchCompany();

  if (!companies.data || companies.data.length < 2) return null;

  return (
    <Select<number>
      aria-label="Switch company"
      suffixIcon={<SwapOutlined />}
      value={user.current_company?.id}
      loading={switchCompany.isPending}
      style={{ minWidth: 200 }}
      options={companies.data.map((company) => ({ value: company.id, label: company.name }))}
      onChange={(companyId) =>
        switchCompany.mutate(companyId, {
          onSuccess: () => void navigate('/', { replace: true }),
          onError: (error) => void message.error(toApiError(error).message),
        })
      }
    />
  );
}
