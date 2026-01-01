"use client";

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface TopMerchantsChartProps {
    transactions: Transaction[];
}

// Colorful palette for distinct bar colors (10 modern colors)
const COLORS = [
    '#0179FE', // Blue
    '#48C9B0', // Teal
    '#F7DC6F', // Yellow
    '#AF7AC5', // Purple
    '#E74C3C', // Red
    '#5D6D7E', // Grey
    '#E67E22', // Orange
    '#58D68D', // Green
    '#F1948A', // Pink
    '#85C1E9', // Light Blue
];

// Helper: Convert ugly raw labels to Title Case
const formatMerchantName = (name: string): string => {
    if (!name) return "Unknown";
    return name
        .toLowerCase()
        .replace(/_/g, " ") // Replace underscores with spaces
        .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize first letter of each word
};

const TopMerchantsChart = ({ transactions }: TopMerchantsChartProps) => {
    // === 1. AGGREGATE BY MERCHANT NAME (ALL TRANSACTIONS) ===
    const merchantTotals: { [name: string]: number } = {};

    if (transactions && Array.isArray(transactions)) {
        transactions.forEach((t) => {
            const merchantName = t.name || "Unknown";

            // Sum absolute values of ALL transactions (both positive and negative)
            const absAmount = Math.abs(t.amount);
            if (merchantTotals[merchantName]) {
                merchantTotals[merchantName] += absAmount;
            } else {
                merchantTotals[merchantName] = absAmount;
            }
        });
    }

    // === 2. SORT & SLICE TOP 10 ===
    const sortedMerchants = Object.entries(merchantTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10); // Take top 10

    // Extract labels (formatted) and data
    const chartLabels = sortedMerchants.map(([name]) => {
        const formatted = formatMerchantName(name);
        return formatted.length > 25 ? formatted.substring(0, 25) + "..." : formatted;
    });
    const chartData = sortedMerchants.map(([, amount]) =>
        Math.round(amount * 100) / 100
    );

    // === 3. CHART CONFIG (HORIZONTAL BAR) ===
    const data = {
        labels: chartLabels,
        datasets: [
            {
                label: "Transaction Volume",
                data: chartData,
                backgroundColor: COLORS, // Chart.js will cycle through colors for each bar
                hoverBackgroundColor: COLORS.map((color) => color + "CC"), // Slightly transparent on hover
                borderRadius: 4,
                borderSkipped: false as const,
                barThickness: 20,
            },
        ],
    };

    const options = {
        indexAxis: "y" as const, // Horizontal bars
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: "#1F2937",
                titleColor: "#F9FAFB",
                bodyColor: "#D1D5DB",
                padding: 12,
                cornerRadius: 8,
                displayColors: true,
                callbacks: {
                    label: (ctx: any) => ` $${ctx.raw.toFixed(2)}`,
                },
            },
        },
        scales: {
            x: {
                beginAtZero: true,
                grid: { display: false },
                ticks: {
                    color: "#9CA3AF",
                    font: { size: 11 },
                    callback: (value: any) => `$${value}`,
                },
                border: { display: false },
            },
            y: {
                grid: { display: false },
                ticks: {
                    color: "#FFFFFF", // White labels for clarity
                    font: { size: 12 },
                },
                border: { display: false },
            },
        },
    };

    // Handle empty state
    if (chartLabels.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-gray-400">
                No spending data available
            </div>
        );
    }

    return <Bar data={data} options={options} />;
};

export default TopMerchantsChart;
