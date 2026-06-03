
/* eslint-disable no-prototype-builtins */
import { type ClassValue, clsx } from "clsx";
import qs from "query-string";
import { twMerge } from "tailwind-merge";
import { z } from "zod";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// FORMAT DATE TIME
export const formatDateTime = (dateString: Date) => {
  const dateTimeOptions: Intl.DateTimeFormatOptions = {
    weekday: "short", // abbreviated weekday name (e.g., 'Mon')
    month: "short", // abbreviated month name (e.g., 'Oct')
    day: "numeric", // numeric day of the month (e.g., '25')
    hour: "numeric", // numeric hour (e.g., '8')
    minute: "numeric", // numeric minute (e.g., '30')
    hour12: true, // use 12-hour clock (true) or 24-hour clock (false)
  };

  const dateDayOptions: Intl.DateTimeFormatOptions = {
    weekday: "short", // abbreviated weekday name (e.g., 'Mon')
    year: "numeric", // numeric year (e.g., '2023')
    month: "2-digit", // abbreviated month name (e.g., 'Oct')
    day: "2-digit", // numeric day of the month (e.g., '25')
  };

  const dateOptions: Intl.DateTimeFormatOptions = {
    month: "short", // abbreviated month name (e.g., 'Oct')
    year: "numeric", // numeric year (e.g., '2023')
    day: "numeric", // numeric day of the month (e.g., '25')
  };

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric", // numeric hour (e.g., '8')
    minute: "numeric", // numeric minute (e.g., '30')
    hour12: true, // use 12-hour clock (true) or 24-hour clock (false)
  };

  const formattedDateTime: string = new Date(dateString).toLocaleString(
    "en-US",
    dateTimeOptions
  );

  const formattedDateDay: string = new Date(dateString).toLocaleString(
    "en-US",
    dateDayOptions
  );

  const formattedDate: string = new Date(dateString).toLocaleString(
    "en-US",
    dateOptions
  );

  const formattedTime: string = new Date(dateString).toLocaleString(
    "en-US",
    timeOptions
  );

  return {
    dateTime: formattedDateTime,
    dateDay: formattedDateDay,
    dateOnly: formattedDate,
    timeOnly: formattedTime,
  };
};

export function formatAmount(amount: number): string {
  const formatter = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  });

  return formatter.format(amount);
}

/**
 * Extract userId string from either a string or an expanded user object
 * Appwrite sometimes expands userId fields into full user objects
 * @param user - Can be a userId string or a user object
 * @returns userId string or null if invalid
 */
export function extractUserId(user: any): string | null {
  if (!user) return null;
  if (typeof user === 'string') return user;
  if (typeof user === 'object') {
    // CRITICAL: Prioritize $id (Appwrite Document ID) FIRST
    // This is required for database.updateDocument() and database.getDocument()
    return user.$id || user.userId || user.id || null;
  }
  return null;
}

/**
 * 🔧 ROBUST ID SANITIZER - Prevents "[object Object]" payload errors
 * Extract a clean ID string from various input formats
 * Handles: String, Object with $id, Object with userId, Object with appwriteItemId, etc.
 * @param item - Can be a string ID or any object with ID properties
 * @returns Clean ID string or empty string if invalid
 */
export function extractId(item: any): string {
  if (!item) return "";
  if (typeof item === "string") return item;
  if (typeof item === "object") {
    // CRITICAL PRIORITY ORDER:
    // 1. $id (Appwrite Document ID) - MUST be first for database operations
    // 2. appwriteItemId (Bank Account Document ID)
    // 3. userId (Custom user field - NOT a document ID)
    // 4. id (Generic fallback)
    return item.$id || item.appwriteItemId || item.userId || item.id || "";
  }
  return "";
}

export const parseStringify = (value: any) => JSON.parse(JSON.stringify(value));

/**
 * Formats a Plaid category name from snake_case/SCREAMING_SNAKE_CASE to Title Case.
 * Example: "FOOD_AND_DRINK" -> "Food and Drink"
 * @param category - The raw category string from Plaid API
 * @returns Formatted category name in Title Case
 */
export function formatCategoryName(category: string): string {
  if (!category || category === "General") return "General";

  return category
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export const removeSpecialCharacters = (value: string) => {
  return value.replace(/[^\w\s]/gi, "");
};

interface UrlQueryParams {
  params: string;
  key: string;
  value: string;
}

export function formUrlQuery({ params, key, value }: UrlQueryParams) {
  const currentUrl = qs.parse(params);

  currentUrl[key] = value;

  return qs.stringifyUrl(
    {
      url: window.location.pathname,
      query: currentUrl,
    },
    { skipNull: true }
  );
}

export function getAccountTypeColors(type: AccountTypes) {
  switch (type) {
    case "depository":
      return {
        bg: "bg-blue-25",
        lightBg: "bg-blue-100",
        title: "text-blue-900",
        subText: "text-blue-700",
      };

    case "credit":
      return {
        bg: "bg-success-25",
        lightBg: "bg-success-100",
        title: "text-success-900",
        subText: "text-success-700",
      };

    default:
      return {
        bg: "bg-green-25",
        lightBg: "bg-green-100",
        title: "text-green-900",
        subText: "text-green-700",
      };
  }
}

export function countTransactionCategories(
  transactions: Transaction[]
): CategoryCount[] {
  const categoryCounts: { [category: string]: number } = {};
  let totalCount = 0;

  // Iterate over each transaction
  transactions &&
    transactions.forEach((transaction) => {
      // Extract the category from the transaction
      const category = transaction.category;

      // If the category exists in the categoryCounts object, increment its count
      if (categoryCounts.hasOwnProperty(category)) {
        categoryCounts[category]++;
      } else {
        // Otherwise, initialize the count to 1
        categoryCounts[category] = 1;
      }

      // Increment total count
      totalCount++;
    });

  // Convert the categoryCounts object to an array of objects
  const aggregatedCategories: CategoryCount[] = Object.keys(categoryCounts).map(
    (category) => ({
      name: category,
      count: categoryCounts[category],
      totalCount,
    })
  );

  // Sort the aggregatedCategories array by count in descending order
  aggregatedCategories.sort((a, b) => b.count - a.count);

  return aggregatedCategories;
}

export function extractCustomerIdFromUrl(url: string) {
  // Split the URL string by '/'
  const parts = url.split("/");

  // Extract the last part, which represents the customer ID
  const customerId = parts[parts.length - 1];

  return customerId;
}

export function encryptId(id: string) {
  return btoa(id);
}

export function decryptId(id: string) {
  return atob(id);
}

export const getTransactionStatus = (date: Date) => {
  const today = new Date();
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(today.getDate() - 2);

  return date > twoDaysAgo ? "Processing" : "Success";
};

export const authFormSchema = (type: string) => z.object({
  // sign up fields
  firstName: type === 'sign-in'
    ? z.string().optional()
    : z.string().min(2, 'Họ và tên lót phải ít nhất 2 ký tự'),
  lastName: type === 'sign-in'
    ? z.string().optional()
    : z.string().min(2, 'Tên phải ít nhất 2 ký tự'),
  phone: type === 'sign-in'
    ? z.string().optional()
    : z.string().regex(/^(03|05|07|08|09|01[2|6|8|9])([0-9]{8})$/, 'Số điện thoại không hợp lệ (định dạng 10 số VN)'),
  address: type === 'sign-in'
    ? z.string().optional()
    : z.string().min(5, 'Địa chỉ phải ít nhất 5 ký tự').max(100, 'Địa chỉ không được quá 100 ký tự'),
  city: type === 'sign-in'
    ? z.string().optional()
    : z.string().min(2, 'Quận/Huyện phải ít nhất 2 ký tự').max(50, 'Quận/Huyện không được quá 50 ký tự'),
  province: type === 'sign-in'
    ? z.string().optional()
    : z.string().min(2, 'Tỉnh/Thành phố phải ít nhất 2 ký tự').max(50, 'Tỉnh/Thành phố không được quá 50 ký tự'),
  dateOfBirth: type === 'sign-in'
    ? z.string().optional()
    : z.string().min(3, 'Ngày sinh là bắt buộc'),
  citizenId: type === 'sign-in'
    ? z.string().optional()
    : z.string().regex(/^\d{9}$|^\d{12}$/, 'Số CCCD/CMND phải là 9 hoặc 12 số'),
  // both sign-in and sign-up
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu phải từ 8 ký tự trở lên'),
})
// Type-safe category configuration for transaction styling
type CategoryConfig = {
  bg: string;
  text: string;
  dot: string;
};

type CategoryConfigMap = {
  [key: string]: CategoryConfig;
};

export const getCategoryConfig = (category: string): CategoryConfig => {
  const configs: CategoryConfigMap = {
    "Food and Drink": { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
    "Travel": { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
    "Transfer": { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" },
    "Payment": { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
    "Bank Fees": { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
    "Entertainment": { bg: "bg-pink-50", text: "text-pink-700", dot: "bg-pink-500" },
    "Shopping": { bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-500" },
    "Personal Care": { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
    "Transportation": { bg: "bg-cyan-50", text: "text-cyan-700", dot: "bg-cyan-500" },
    "Processing": { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
    "Success": { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
    "default": { bg: "bg-slate-50", text: "text-slate-700", dot: "bg-slate-500" }
  };

  // Type-safe access with fallback to default
  return configs[category] || configs["default"];
};