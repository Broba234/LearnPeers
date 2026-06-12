// TODO: Install react-apexcharts if chart functionality is needed
// Chart component stubbed out to avoid build errors

export default function BarChartOne() {
  const data = [168, 385, 201, 298, 187, 195, 291, 110, 215, 390, 280, 112];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  return (
    <div className="max-w-full overflow-x-auto">
      <div className="min-w-[1000px] p-4">
        <div className="bg-gray-100 rounded-lg p-4 text-center">
          <h3 className="text-lg font-medium text-gray-600 mb-4">Sales Chart</h3>
          <p className="text-sm text-gray-500 mb-4">Chart component requires react-apexcharts to be installed</p>
          <div className="grid grid-cols-12 gap-2 text-xs">
            {months.map((month, index) => (
              <div key={month} className="text-center">
                <div className="text-gray-600 mb-1">{month}</div>
                <div className="bg-brand-500 rounded" style={{ height: `${(data[index] / 400) * 100}px` }}></div>
                <div className="text-gray-500 mt-1">{data[index]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
