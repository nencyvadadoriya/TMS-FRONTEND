import React from 'react';

type SkeletonBoxProps = {
  className?: string;
};

const SkeletonBox: React.FC<SkeletonBoxProps> = ({ className = '' }) => {
  return <div className={`bg-gray-200 animate-pulse ${className}`} />;
};

type ContainerProps = {
  children: React.ReactNode;
  containerClassName?: string;
};

const PageContainer: React.FC<ContainerProps> = ({ children, containerClassName }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className={containerClassName || 'w-full max-w-full mx-auto px-4 sm:px-6 md:px-8'}>
        {children}
      </div>
    </div>
  );
};

export const TeamPageSkeleton: React.FC = () => {
  return (
    <PageContainer>
      <div className="space-y-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SkeletonBox className="h-12 w-12 rounded-xl" />
            <div>
              <SkeletonBox className="h-6 w-48 rounded mb-2" />
              <SkeletonBox className="h-4 w-72 rounded" />
            </div>
          </div>
          <SkeletonBox className="h-10 w-32 rounded-lg" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
              <SkeletonBox className="h-8 w-16 rounded mb-2" />
              <SkeletonBox className="h-4 w-24 rounded" />
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <SkeletonBox className="h-12 w-full max-w-lg rounded-lg" />
            <div className="flex items-center gap-3">
              <SkeletonBox className="h-10 w-32 rounded-lg" />
              <SkeletonBox className="h-10 w-10 rounded-lg" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <SkeletonBox className="h-14 w-14 rounded-full" />
                    <div className="min-w-0">
                      <SkeletonBox className="h-5 w-48 rounded mb-2" />
                      <SkeletonBox className="h-4 w-56 rounded" />
                      <div className="mt-3 flex gap-2">
                        <SkeletonBox className="h-6 w-24 rounded" />
                        <SkeletonBox className="h-6 w-20 rounded" />
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <SkeletonBox className="h-4 w-20 rounded mb-2" />
                    <SkeletonBox className="h-6 w-10 rounded" />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3 mt-5">
                  {[0, 1, 2, 3].map((j) => (
                    <SkeletonBox key={j} className="h-16 rounded-lg" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export const TasksPageSkeleton: React.FC = () => {
  return (
    <PageContainer>
      <div className="py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <SkeletonBox className="h-7 w-44 rounded mb-2" />
            <SkeletonBox className="h-4 w-80 rounded" />
          </div>
          <div className="flex gap-3">
            <SkeletonBox className="h-10 w-28 rounded-lg" />
            <SkeletonBox className="h-10 w-36 rounded-lg" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex flex-col lg:flex-row gap-4">
            <SkeletonBox className="h-11 flex-1 rounded-lg" />
            <div className="flex gap-3">
              <SkeletonBox className="h-11 w-32 rounded-lg" />
              <SkeletonBox className="h-11 w-32 rounded-lg" />
              <SkeletonBox className="h-11 w-10 rounded-lg" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <SkeletonBox className="h-5 w-2/3 rounded mb-3" />
                    <div className="flex flex-wrap gap-2">
                      <SkeletonBox className="h-6 w-20 rounded-full" />
                      <SkeletonBox className="h-6 w-24 rounded-full" />
                      <SkeletonBox className="h-6 w-28 rounded-full" />
                    </div>
                  </div>
                  <SkeletonBox className="h-9 w-9 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export const CalendarPageSkeleton: React.FC = () => {
  return (
    <PageContainer>
      <div className="py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <SkeletonBox className="h-7 w-44 rounded mb-2" />
            <SkeletonBox className="h-4 w-80 rounded" />
          </div>
          <SkeletonBox className="h-5 w-52 rounded" />
        </div>

        <div className="bg-white shadow rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <SkeletonBox className="h-4 w-28 rounded" />
              <SkeletonBox className="h-6 w-24 rounded" />
            </div>
            <div className="flex items-center gap-2">
              <SkeletonBox className="h-10 w-24 rounded-lg" />
              <SkeletonBox className="h-10 w-32 rounded-lg" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <SkeletonBox className="h-8 w-48 rounded" />
            <div className="flex items-center gap-2">
              <SkeletonBox className="h-9 w-9 rounded-lg" />
              <SkeletonBox className="h-9 w-9 rounded-lg" />
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {[...Array(7)].map((_, i) => (
              <SkeletonBox key={`dow-${i}`} className="h-8 rounded" />
            ))}
            {[...Array(42)].map((_, i) => (
              <SkeletonBox key={`day-${i}`} className="h-20 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export const UserProfileSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <SkeletonBox className="h-14 w-14 rounded-xl" />
            <div>
              <SkeletonBox className="h-8 w-64 rounded mb-2" />
              <SkeletonBox className="h-4 w-80 rounded" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 md:p-8">
                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 mb-8">
                  <SkeletonBox className="h-32 w-32 rounded-2xl" />
                  <div className="flex-1">
                    <SkeletonBox className="h-7 w-56 rounded mb-3" />
                    <SkeletonBox className="h-4 w-72 rounded" />
                    <div className="mt-3">
                      <SkeletonBox className="h-7 w-32 rounded-full" />
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <SkeletonBox className="h-6 w-48 rounded mb-4" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <SkeletonBox className="h-6 w-20 rounded mb-3" />
                      <SkeletonBox className="h-4 w-full rounded" />
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <SkeletonBox className="h-6 w-20 rounded mb-3" />
                      <SkeletonBox className="h-4 w-3/4 rounded" />
                    </div>
                  </div>
                </div>

                <div className="mb-8">
                  <SkeletonBox className="h-6 w-48 rounded mb-4" />
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <SkeletonBox className="h-4 w-40 rounded mb-2" />
                        <SkeletonBox className="h-5 w-28 rounded" />
                      </div>
                      <SkeletonBox className="h-10 w-48 rounded-lg" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6">
              <SkeletonBox className="h-6 w-40 rounded bg-white/30" />
              <div className="mt-6 space-y-4">
                <SkeletonBox className="h-4 w-28 rounded bg-white/25" />
                <SkeletonBox className="h-4 w-36 rounded bg-white/25" />
                <SkeletonBox className="h-4 w-24 rounded bg-white/25" />
              </div>
              <div className="mt-6 pt-6 border-t border-white/20">
                <SkeletonBox className="h-4 w-56 rounded bg-white/25" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

type BrandDetailSkeletonProps = {
  containerClassName?: string;
};

export const BrandDetailSkeleton: React.FC<BrandDetailSkeletonProps> = ({ containerClassName }) => {
  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className={containerClassName || 'w-full max-w-full mx-auto px-4 sm:px-6 md:px-8'}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between py-6 gap-4">
            <div className="flex items-center gap-5">
              <SkeletonBox className="h-10 w-10 rounded-lg" />
              <div className="flex items-center gap-4">
                <SkeletonBox className="h-12 w-12 rounded-xl" />
                <div>
                  <SkeletonBox className="h-6 w-48 rounded mb-2" />
                  <SkeletonBox className="h-4 w-56 rounded" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-8">
            <SkeletonBox className="h-6 w-20 rounded" />
          </div>
        </div>
      </div>

      <div className={containerClassName || 'w-full max-w-full mx-auto px-4 sm:px-6 md:px-8'}>
        <div className="py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-4 rounded-xl border-2 border-gray-200 shadow-sm">
                <SkeletonBox className="h-4 w-24 rounded mb-2" />
                <SkeletonBox className="h-8 w-16 rounded" />
              </div>
            ))}
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <SkeletonBox className="h-11 w-full max-w-md rounded-lg" />
              <div className="flex items-center gap-2">
                <SkeletonBox className="h-10 w-28 rounded-lg" />
                <SkeletonBox className="h-10 w-28 rounded-lg" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-2 flex-1">
                    <SkeletonBox className="h-5 w-3/4 rounded" />
                    <SkeletonBox className="h-4 w-1/2 rounded" />
                  </div>
                  <SkeletonBox className="h-8 w-8 rounded-lg" />
                </div>
                <SkeletonBox className="h-8 w-24 rounded-full mb-4" />
                <div className="space-y-3 mb-5">
                  <SkeletonBox className="h-4 w-full rounded" />
                  <SkeletonBox className="h-4 w-2/3 rounded" />
                </div>
                <div className="flex gap-2 pt-4">
                  <SkeletonBox className="h-10 flex-1 rounded-lg" />
                  <SkeletonBox className="h-10 w-10 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
