import { Suspense } from 'react';
import { UploadForm } from './UploadForm';

export const metadata = { title: 'New analysis · 5dot' };

export default function Page() {
  return (
    <Suspense>
      <UploadForm />
    </Suspense>
  );
}
