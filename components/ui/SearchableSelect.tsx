"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

export interface SelectOption {
  value: string;
  label: string;
  group?: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  required?: boolean;
  renderValue?: (selected: SelectOption | undefined, placeholder: string) => React.ReactNode;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select…",
  disabled = false,
  className = "",
  id,
  name,
  required,
  renderValue,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [rect, setRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const selected = options.find((o) => o.value === value);
  const showSearch = options.length > 5;

  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const groupMap = filtered.reduce<Record<string, SelectOption[]>>((acc, opt) => {
    const g = opt.group ?? "";
    if (!acc[g]) acc[g] = [];
    acc[g].push(opt);
    return acc;
  }, {});
  const hasGroups = Object.keys(groupMap).some((k) => k !== "");

  const openDropdown = useCallback(() => {
    if (disabled) return;
    if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
    setOpen(true);
    setQuery("");
  }, [disabled]);

  const closeDropdown = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  const select = useCallback(
    (val: string) => {
      onChange(val);
      closeDropdown();
    },
    [onChange, closeDropdown]
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        listRef.current?.contains(e.target as Node)
      )
        return;
      closeDropdown();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, closeDropdown]);

  useEffect(() => {
    if (open && showSearch) {
      const t = setTimeout(() => searchRef.current?.focus(), 10);
      return () => clearTimeout(t);
    }
  }, [open, showSearch]);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
    };
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  const dropdownStyle: React.CSSProperties = rect
    ? { position: "fixed", top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 }
    : { display: "none" };

  const dropdown =
    open && mounted
      ? createPortal(
          <div
            ref={listRef}
            style={dropdownStyle}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden"
          >
            {showSearch && (
              <div className="px-3 pt-2.5 pb-1.5 border-b border-gray-100 dark:border-gray-700">
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") closeDropdown(); }}
                  placeholder="Search…"
                  className="w-full px-2.5 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            )}
            <div className="max-h-56 overflow-y-auto py-1">
              {Object.entries(groupMap).map(([group, opts]) => (
                <div key={group}>
                  {hasGroups && group && (
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 select-none">
                      {group}
                    </div>
                  )}
                  {opts.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); select(opt.value); }}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        opt.value === value
                          ? "bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 font-medium"
                          : "text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="px-3 py-3 text-sm text-gray-400 dark:text-gray-500 text-center">
                  No results
                </div>
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      {name && <input type="hidden" name={name} value={value} required={required} />}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => (open ? closeDropdown() : openDropdown())}
        className={`relative w-full text-left flex items-center justify-between gap-2 transition-colors focus:outline-none ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        } ${className}`}
      >
        <span className={`block truncate flex-1 min-w-0 ${!selected ? "opacity-60" : ""}`}>
          {renderValue
            ? renderValue(selected, placeholder)
            : (selected ? selected.label : placeholder)}
        </span>
        <svg
          className={`flex-shrink-0 w-4 h-4 opacity-50 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 20 20"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.79 7.396L10 12.604l5.208-5.208" />
        </svg>
      </button>
      {dropdown}
    </>
  );
};

export default SearchableSelect;
