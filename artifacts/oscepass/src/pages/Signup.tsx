import { GuestOnly } from '@/features/auth/guards';
import { SignupForm } from '@/features/auth/SignupForm';

export default function Signup() {
  return <GuestOnly><SignupForm /></GuestOnly>;
}
