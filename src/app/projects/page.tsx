import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function ProjectsPage() {
  return (
    <DashboardLayout>
      <div className="flex flex-col flex-1 w-full h-full min-h-[calc(100vh-4rem)] py-6 px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-white mb-6">Projects</h1>
        {/* Projects list will go here */}
        <div className="text-center text-gray-400 py-12">Project listing coming soon.</div>
      </div>
    </DashboardLayout>
  );
}

