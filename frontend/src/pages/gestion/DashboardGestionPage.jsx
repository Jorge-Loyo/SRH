import DotacionKpisPanel from '../../components/ui/DotacionKpisPanel';

export default function DashboardGestionPage() {
  return (
    <div className="flex flex-col">
      <div className="flex-shrink-0 px-4 pt-4 pb-2 border-b border-gray-200 bg-white">
        <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
      </div>
      <DotacionKpisPanel defaultOpen collapsible={false} />
    </div>
  );
}
