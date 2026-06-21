import { useState } from "react";
import SearchableSelect from "@/components/ui/SearchableSelect";

interface CountryCode {
  code: string;
  label: string;
}

interface PhoneInputProps {
  countries: CountryCode[];
  placeholder?: string;
  onChange?: (phoneNumber: string) => void;
  selectPosition?: "start" | "end";
}

const PhoneInput: React.FC<PhoneInputProps> = ({
  countries,
  placeholder = "+1 (555) 000-0000",
  onChange,
  selectPosition = "start",
}) => {
  const [selectedCountry, setSelectedCountry] = useState<string>("US");
  const [phoneNumber, setPhoneNumber] = useState<string>("+1");

  const countryCodes: Record<string, string> = countries.reduce(
    (acc, { code, label }) => ({ ...acc, [code]: label }),
    {}
  );

  const handleCountryChange = (code: string) => {
    setSelectedCountry(code);
    setPhoneNumber(countryCodes[code]);
    onChange?.(countryCodes[code]);
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(e.target.value);
    onChange?.(e.target.value);
  };

  const countryOptions = countries.map(({ code, label }) => ({
    value: code,
    label: `${code} ${label}`,
  }));

  const flagSelect = (
    <SearchableSelect
      value={selectedCountry}
      onChange={handleCountryChange}
      options={countryOptions}
      renderValue={(opt) => <span className="font-medium">{opt?.value ?? selectedCountry}</span>}
      className={`h-full px-3 bg-transparent border-0 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-400 focus:outline-none focus:ring-0 w-20 ${
        selectPosition === "start" ? "border-r rounded-l-lg" : "border-l rounded-r-lg"
      }`}
    />
  );

  return (
    <div className="relative flex items-stretch h-11 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent shadow-theme-xs focus-within:border-brand-300 focus-within:ring-3 focus-within:ring-brand-500/10 dark:focus-within:border-brand-800">
      {selectPosition === "start" && flagSelect}
      <input
        type="tel"
        value={phoneNumber}
        onChange={handlePhoneNumberChange}
        placeholder={placeholder}
        className="flex-1 min-w-0 px-4 py-3 text-sm text-gray-800 bg-transparent border-0 outline-none placeholder:text-gray-400 dark:text-white/90 dark:placeholder:text-white/30"
      />
      {selectPosition === "end" && flagSelect}
    </div>
  );
};

export default PhoneInput;
