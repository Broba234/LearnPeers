import React from "react";
import RangePicker from "./RangePicker";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** When provided, renders the range toggle wired to ?range=. */
  range?: string;
  children?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, range, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {children}
        {range && <RangePicker current={range} />}
      </div>
    </div>
  );
}
