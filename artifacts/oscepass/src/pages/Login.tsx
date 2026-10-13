import { GuestOnly } from '@/features/auth/guards';
import { LoginForm } from '@/features/auth/LoginForm';

export default function Login() {
  return <GuestOnly><LoginForm /></GuestOnly>;
}
