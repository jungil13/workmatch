import { redirect } from 'next/navigation';

export default async function EmployerSignInRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const entries = Object.entries(sp).flatMap(([k, v]) =>
    Array.isArray(v) ? v.map((item) => [k, item]) : v !== undefined ? [[k, v]] : []
  );
  const queryString = new URLSearchParams(entries as [string, string][]).toString();
  redirect(`/auth/sign-in${queryString ? `?${queryString}` : ''}`);
}
