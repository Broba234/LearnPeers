// TODO: Install @react-jvectormap/core and @react-jvectormap/world if map functionality is needed
// Component stubbed out to avoid build errors

// Define the component props
interface CountryMapProps {
  mapColor?: string;
}

const CountryMap: React.FC<CountryMapProps> = ({ mapColor }) => {
  const countries = [
    { name: "United States", visitors: "2.1K" },
    { name: "India", visitors: "1.8K" },
    { name: "United Kingdom", visitors: "1.2K" },
    { name: "Sweden", visitors: "0.9K" },
  ];

  return (
    <div className="max-w-full overflow-x-auto">
      <div className="min-w-[400px] p-4">
        <div className="bg-gray-100 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-gray-600 mb-4">Country Map</h3>
          <p className="text-sm text-gray-500 mb-6">
            Map component requires @react-jvectormap/core to be installed
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {countries.map((country) => (
              <div key={country.name} className="flex justify-between items-center p-3 bg-white rounded-lg">
                <span className="font-medium text-gray-700">{country.name}</span>
                <span className="text-brand-600 font-semibold">{country.visitors}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CountryMap;
