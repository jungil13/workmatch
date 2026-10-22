import { redirect } from 'next/navigation';

export default function InterviewPracticeRedirectPage() {
  redirect('/seeker/dashboard?openAssistant=true');
}
