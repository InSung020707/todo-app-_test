import { Suspense } from 'react';
import { MainScreen } from '@/components/main/MainScreen';

// MainScreen reads the ?view= / ?cat= query via useSearchParams, which
// requires a Suspense boundary to avoid forcing the whole route to CSR.
export default function MainPage() {
  return (
    <div className="app">
      <Suspense fallback={null}>
        <MainScreen />
      </Suspense>
    </div>
  );
}
