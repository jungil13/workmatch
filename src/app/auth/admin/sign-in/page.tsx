import { redirect } from 'next/navigation';

export default function AdminSignInRedirectPage() {
  redirect('/auth/sign-in');
}
