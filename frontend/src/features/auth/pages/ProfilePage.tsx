import { MailOutlined, SafetyCertificateOutlined, ShopOutlined } from '@ant-design/icons';
import { PageHeader } from '@/components/PageHeader';
import { UserAvatar } from '@/components/UserAvatar';
import { usePermissions } from '@/hooks/usePermission';
import { ChangePasswordForm } from '../components/ChangePasswordForm';
import { ProfileForm } from '../components/ProfileForm';
import { TwoFactorSection } from '../components/TwoFactorSection';

const roleLabel = (role: string) =>
  role.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

export function ProfilePage() {
  const { user } = usePermissions();
  if (!user) return null;

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="My profile"
        description="Manage your personal details and account security."
      />
      <div className="grid items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="hf-surface overflow-hidden lg:sticky lg:top-[84px]">
          <div className="h-20 bg-primary" />
          <div className="-mt-10 px-6 pb-6">
            <UserAvatar name={user.name} size="xl" className="ring-4 ring-white" />
            <div className="mt-3 text-lg font-semibold text-slate-900">{user.name}</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {user.roles.map((role) => (
                <span
                  key={role}
                  className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary"
                >
                  {roleLabel(role)}
                </span>
              ))}
            </div>
            <dl className="m-0 mt-5 flex flex-col gap-3 border-t border-border-soft pt-5 text-[13px]">
              <div className="flex items-center gap-2.5 text-slate-600">
                <MailOutlined className="text-slate-400" />
                <dd className="m-0 truncate">{user.email}</dd>
              </div>
              {user.current_company ? (
                <div className="flex items-center gap-2.5 text-slate-600">
                  <ShopOutlined className="text-slate-400" />
                  <dd className="m-0 truncate">{user.current_company.name}</dd>
                </div>
              ) : null}
              <div className="flex items-center gap-2.5 text-slate-600">
                <SafetyCertificateOutlined className="text-slate-400" />
                <dd className="m-0">
                  {user.email_verified ? 'Email verified' : 'Email not verified'}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
        <div className="flex min-w-0 flex-col gap-6">
          <ProfileForm user={user} />
          <ChangePasswordForm />
          <TwoFactorSection user={user} />
        </div>
      </div>
    </>
  );
}
