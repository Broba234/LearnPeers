import React, { useState } from "react";
import { CheckCircle, Clock, DollarSign } from "lucide-react";

interface Subject {
  id: number;
  name: string;
  code: string;
  duration_1: string;
  duration_2: string;
  duration_3: string;
  price_1: string;
  price_2: string;
  price_3: string;
}

function UpdateProfileTimeSlot({
  selectedSubjectsfromProfile,
  setSelectedSubjectsWithPrice,
}: any) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<number>(0);
  const [selectedDuration, setSelectedDuration] = useState<string>("0.5");
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>(
    (selectedSubjectsfromProfile || []).map((subject: any) => ({
      ...subject,
      duration_1: subject.duration_1 || "0.5",
      duration_2: subject.duration_2 || "1",
      duration_3: subject.duration_3 || "1.5",
      price_1: subject.price_1 || "",
      price_2: subject.price_2 || "",
      price_3: subject.price_3 || "",
    }))
  );
  const [sessionPrice, setSessionPrice] = useState<string>("");

  const durationOptions = [
    {
      value: "0.5",
      label: "30 min",
      name: "duration_1",
      color: "bg-brand-100 text-brand-800",
    },
    {
      value: "1",
      label: "1 hour",
      name: "duration_2",
      color: "bg-brand-100 text-brand-800",
    },
    {
      value: "1.5",
      label: "1.5 hour",
      name: "duration_3",
      color: "bg-brand-100 text-brand-800",
    },
  ];

  const selectedSubject =
    selectedSubjects.find((s, index) => index === selectedSubjectId) ||
    selectedSubjects[0];

  const getDurationKey = (duration: string) => {
    if (duration === "0.5") return "duration_1";
    if (duration === "1") return "duration_2";
    return "duration_3";
  };

  const getPriceKey = (duration: string) => {
    if (duration === "0.5") return "price_1";
    if (duration === "1") return "price_2";
    return "price_3";
  };

  const updateSubjectDuration = (
    id: number,
    duration_name: string,
    duration: string
  ) => {
    const updated = selectedSubjects.map((subject, index) =>
      index === id ? { ...subject, [duration_name]: duration, duration } : subject
    );
    setSelectedSubjects(updated);
    setSelectedSubjectsWithPrice(updated);
    setSelectedDuration(duration);

    const nextSelected = updated[id];
    if (nextSelected) {
      const priceKey = getPriceKey(duration);
      setSessionPrice(nextSelected[priceKey] ?? "");
    }
  };

  const updateSubjectPrice = (
    id: number,
    price_name: string,
    price: string
  ) => {
    const updated = selectedSubjects.map((subject, index) =>
      index === id ? { ...subject, [price_name]: price } : subject
    );
    setSelectedSubjects(updated);
    setSessionPrice(price);
    setSelectedSubjectsWithPrice(updated);
  };

  return (
    <div className="w-full mx-auto p-4">
      <div className="transition-all duration-300">
        {/* Header Section */}


        {/* Subjects Chips */}
        <div className="flex flex-wrap gap-3 mb-8">
          {selectedSubjects.map((subject, index) => (
            <div
              key={index}
              onClick={() => {
                setSelectedSubjectId(index);
                const durationKey = getDurationKey(
                  subject.duration_1 ||
                    subject.duration_2 ||
                    subject.duration_3 ||
                    "0.5"
                );
                const durationValue = subject[durationKey] || "0.5";
                const priceKey = getPriceKey(durationValue);

                setSelectedDuration(durationValue);
                setSessionPrice(subject[priceKey] || "");
              }}
              className={`inline-flex items-center gap-2 border px-4 py-2.5 rounded-xl text-sm shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group ${
                selectedSubjectId === index
                  ? "bg-gradient-to-r from-brand-50 to-brand-50 border-brand-700 ring-2 ring-brand-100 ring-opacity-50"
                  : "bg-gradient-to-r from-brand-50 to-brand-50 border-brand-100 hover:border-brand-200"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
                  selectedSubjectId === index
                    ? "bg-gradient-to-r from-brand-500 to-brand-500"
                    : "bg-gradient-to-r from-brand-400 to-brand-400"
                }`}
              >
                <CheckCircle size={12} className="text-white" />
              </div>
              <div className="flex flex-col">
                <span
                  className={`font-semibold ${
                    selectedSubjectId === index
                      ? "text-gray-900"
                      : "text-gray-800"
                  }`}
                >
                  {subject.name}
                </span>
                <span className="text-xs text-gray-500">{subject.code}</span>
              </div>

              {/* Show price/duration badge for each subject */}
              <div className="ml-2 px-2 py-1 bg-white/80 rounded-lg text-xs border border-brand-100">
                <div className="flex items-center gap-1">
                  <Clock size={10} className="text-brand-500" />
                  <span>
                    {subject.duration_1 == "0.5" && "30 min"}
                  </span>
                  <span className="text-gray-300 mx-1">•</span>
                  <DollarSign size={10} className="text-green-500" />
                  <span>${subject.price_1 || "0"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={10} className="text-brand-500" />
                  <span>{subject.duration_2 == "1" && "1 hour"}</span>
                  <span className="text-gray-300 mx-1">•</span>
                  <DollarSign size={10} className="text-green-500" />
                  <span>${subject.price_2 || "0"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={10} className="text-brand-500" />
                  <span>{subject.duration_3 == "1.5" && "1.5 hour"}</span>
                  <span className="text-gray-300 mx-1">•</span>
                  <DollarSign size={10} className="text-green-500" />
                  <span>${subject.price_3 || "0"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Configuration for Selected Subject */}
        {selectedSubject && (
          <>
            {/* Divider */}
            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-white text-sm text-gray-500">
                  Configuring {selectedSubject.name}
                </span>
              </div>
            </div>

            {/* Duration Selection */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={20} className="text-gray-400" />
                <h5 className="font-semibold text-gray-900">
                  Duration for {selectedSubject.name}
                </h5>
              </div>
              <div className="flex gap-3">
                {durationOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`flex-1 cursor-pointer transition-all duration-300 ${
                      selectedDuration === option.value
                        ? "ring-2 rounded-xl ring-offset-2 ring-brand-500 transform scale-[1.02]"
                        : "hover:scale-[1.02]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="duration"
                      value={option.value}
                      checked={selectedDuration === option.value}
                        onChange={(e) =>
                          updateSubjectDuration(
                            selectedSubjectId,
                            option.name,
                            e.target.value
                          )
                        }
                      className="sr-only"
                    />
                    <div
                      className={`${option.color} border border-transparent rounded-xl p-4 text-center transition-all duration-300 hover:shadow-md`}
                    >
                      <div className="font-bold text-lg mb-1">
                        {option.label}
                      </div>
                      <div className="text-xs opacity-75">session</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Input */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign size={20} className="text-gray-400" />
                <h5 className="font-semibold text-gray-900">
                  Price for {selectedSubject.name}
                </h5>
              </div>
              <div className="relative max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  value={sessionPrice}
                  aria-placeholder="0.00"
                  onChange={(e: any) => {
                    const priceKey = getPriceKey(selectedDuration);
                    updateSubjectPrice(
                      selectedSubjectId,
                      priceKey,
                      e.target.value
                    );
                  }}
                  placeholder="0.00"
                  className="block w-full pl-7 pr-12 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">USD</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-3">
                Total for {selectedSubject.name}:{" "}
                <span className="font-semibold text-gray-900">
                  ${sessionPrice || "0.00"} per{" "}
                  {selectedDuration === "0.5"
                    ? "30 min"
                    : selectedDuration === "1"
                    ? "1 hour"
                    : "1.5 hour"}{" "}
                  session
                </span>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default UpdateProfileTimeSlot;
