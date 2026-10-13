import { AppLayout } from '@/components/layouts/AppLayout';
import { PrivacySection } from '@/features/account/PrivacySection';
import { ProfileSection } from '@/features/account/ProfileSection';
import { SecuritySection } from '@/features/account/SecuritySection';
import { SessionsSection } from '@/features/account/SessionsSection';
import { usePageMeta } from '@/lib/usePageMeta';

export default function Account() {
  usePageMeta('Account', 'Manage your profile, security, devices and data.');
  return (
    <AppLayout>
      <h1>Your account</h1>
      <div className="account-grid">
        <ProfileSection />
        <SecuritySection />
        <SessionsSection />
        <PrivacySection />
      </div>
    </AppLayout>
  );
}
