import React from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { FormControl, FormLabel, FormMessage } from "@/components/ui/form";

interface DateOfBirthInputProps {
    value: string;
    onChange: (value: string) => void;
    error?: string;
}

const DateOfBirthInput = ({ value, onChange, error }: DateOfBirthInputProps) => {
    // Parse existing value (YYYY-MM-DD format)
    const [year, month, day] = value ? value.split('-') : ['', '', ''];

    // Generate years (from current year - 100 to current year - 18)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 83 }, (_, i) => currentYear - 18 - i);

    // Months
    const months = [
        { value: '01', label: 'January' },
        { value: '02', label: 'February' },
        { value: '03', label: 'March' },
        { value: '04', label: 'April' },
        { value: '05', label: 'May' },
        { value: '06', label: 'June' },
        { value: '07', label: 'July' },
        { value: '08', label: 'August' },
        { value: '09', label: 'September' },
        { value: '10', label: 'October' },
        { value: '11', label: 'November' },
        { value: '12', label: 'December' },
    ];

    // Days
    const days = Array.from({ length: 31 }, (_, i) => {
        const day = i + 1;
        return day < 10 ? `0${day}` : `${day}`;
    });

    const handleChange = (type: 'year' | 'month' | 'day', newValue: string) => {
        let newYear = year;
        let newMonth = month;
        let newDay = day;

        if (type === 'year') newYear = newValue;
        if (type === 'month') newMonth = newValue;
        if (type === 'day') newDay = newValue;

        // Only update if all three are selected
        if (newYear && newMonth && newDay) {
            onChange(`${newYear}-${newMonth}-${newDay}`);
        } else {
            // Store partial selection
            onChange(`${newYear || ''}-${newMonth || ''}-${newDay || ''}`);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <FormLabel className="text-14 w-full max-w-[280px] font-medium text-gray-700">
                Date of Birth
            </FormLabel>
            <div className="flex gap-3">
                {/* Year */}
                <div className="flex-1">
                    <Select value={year} onValueChange={(val) => handleChange('year', val)}>
                        <SelectTrigger className="input-class !text-gray-300 data-[state=open]:!text-white">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                            {years.map((y) => (
                                <SelectItem key={y} value={String(y)}>
                                    {y}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Month */}
                <div className="flex-1">
                    <Select value={month} onValueChange={(val) => handleChange('month', val)}>
                        <SelectTrigger className="input-class !text-gray-300 data-[state=open]:!text-white">
                            <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                            {months.map((m) => (
                                <SelectItem key={m.value} value={m.value}>
                                    {m.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Day */}
                <div className="flex-1">
                    <Select value={day} onValueChange={(val) => handleChange('day', val)}>
                        <SelectTrigger className="input-class !text-gray-300 data-[state=open]:!text-white">
                            <SelectValue placeholder="Day" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                            {days.map((d) => (
                                <SelectItem key={d} value={d}>
                                    {d}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            {error && (
                <p className="text-12 text-red-500 font-medium">{error}</p>
            )}
        </div>
    );
};

export default DateOfBirthInput;
