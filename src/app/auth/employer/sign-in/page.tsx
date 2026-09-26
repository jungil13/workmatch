import { redirect } from 'next/navigation';

export default function EmployerSignInRedirectPage() {
  redirect('/auth/sign-in');
}
