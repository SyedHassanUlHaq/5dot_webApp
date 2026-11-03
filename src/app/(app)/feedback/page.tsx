import { Suspense } from 'react';
import { FeedbackForm } from './FeedbackForm';

export const metadata = { title: 'Feedback · 5dot' };

export default function Page() {
  return (
    <Suspense>
      <FeedbackForm />
    </Suspense>
  );
}
