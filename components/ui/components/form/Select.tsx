import { useState } from "react";
import SearchableSelect, { type SelectOption } from "@/components/ui/SearchableSelect";

interface SelectProps {
  options: SelectOption[];
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
  defaultValue?: string;
}

const Select: React.FC<SelectProps> = ({
  options,
  placeholder = "Select an option",
  onChange,
  className = "",
  defaultValue = "",
}) => {
  const [selectedValue, setSelectedValue] = useState<string>(defaultValue);

  const handleChange = (value: string) => {
    setSelectedValue(value);
    onChange(value);
  };

  return (
    <SearchableSelect
      options={options}
      value={selectedValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={`h-11 px-4 py-2.5 pr-8 text-sm border rounded-lg border-gray-300 bg-transparent dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:focus:border-brand-800 ${className}`}
    />
  );
};

export default Select;
