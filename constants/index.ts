export const sidebarLinks = [
  {
    imgURL: "/icons/home.svg",
    route: "/",
    label: "Trang chủ",
  },
  {
    imgURL: "/icons/dollar-circle.svg",
    route: "/my-banks",
    label: "Tài khoản của tôi",
  },
  {
    imgURL: "/icons/money-send.svg",
    route: "/payment-transfer",
    label: "Chuyển tiền",
  },
  {
    imgURL: "/icons/qr-code.svg",
    route: "/qr-transfer",
    label: "Chuyển khoản QR",
  },
  {
    imgURL: "/icons/user.svg",
    route: "/saved-recipients",
    label: "Người thụ hưởng",
  },
  {
    imgURL: "/icons/monitor.svg",
    route: "/ai-insights",
    label: "Đầu tư",
  },
  {
    imgURL: "/icons/transaction.svg",
    route: "/autopilot",
    label: "Tự động hóa",
  },
];

// good_user / good_password - Bank of America
export const TEST_USER_ID = "6627ed3d00267aa6fa3e";

// custom_user -> Chase Bank
// export const TEST_ACCESS_TOKEN =
//   "access-sandbox-da44dac8-7d31-4f66-ab36-2238d63a3017";

// custom_user -> Chase Bank
export const TEST_ACCESS_TOKEN =
  "access-sandbox-229476cf-25bc-46d2-9ed5-fba9df7a5d63";

export const ITEMS = [
  {
    id: "6624c02e00367128945e", // appwrite item Id
    accessToken: "access-sandbox-83fd9200-0165-4ef8-afde-65744b9d1548",
    itemId: "VPMQJKG5vASvpX8B6JK3HmXkZlAyplhW3r9xm",
    userId: "6627ed3d00267aa6fa3e",
    accountId: "X7LMJkE5vnskJBxwPeXaUWDBxAyZXwi9DNEWJ",
  },
  {
    id: "6627f07b00348f242ea9", // appwrite item Id
    accessToken: "access-sandbox-74d49e15-fc3b-4d10-a5e7-be4ddae05b30",
    itemId: "Wv7P6vNXRXiMkoKWPzeZS9Zm5JGWdXulLRNBq",
    userId: "6627ed3d00267aa6fa3e",
    accountId: "x1GQb1lDrDHWX4BwkqQbI4qpQP1lL6tJ3VVo9",
  },
];

export const topCategoryStyles = {
  "Food and Drink": {
    bg: "bg-gray-25",
    circleBg: "bg-primary-500",
    text: {
      main: "text-gray-700",
      count: "text-gray-600",
    },
    progress: {
      bg: "bg-gray-200",
      indicator: "bg-success-500",
    },
    icon: "/icons/monitor.svg",
  },
  Travel: {
    bg: "bg-gray-25",
    circleBg: "bg-success-500",
    text: {
      main: "text-gray-700",
      count: "text-gray-600",
    },
    progress: {
      bg: "bg-gray-200",
      indicator: "bg-success-500",
    },
    icon: "/icons/coins.svg",
  },
  default: {
    bg: "bg-gray-25",
    circleBg: "bg-primary-500",
    text: {
      main: "text-gray-700",
      count: "text-gray-600",
    },
    progress: {
      bg: "bg-gray-200",
      indicator: "bg-success-500",
    },
    icon: "/icons/shopping-bag.svg",
  },
};

export const transactionCategoryStyles = {
  "Food and Drink": {
    borderColor: "border-orange-200",
    backgroundColor: "bg-orange-500",
    textColor: "text-orange-700",
    chipBackgroundColor: "bg-orange-50",
  },
  Payment: {
    borderColor: "border-emerald-200",
    backgroundColor: "bg-emerald-500",
    textColor: "text-emerald-700",
    chipBackgroundColor: "bg-emerald-50",
  },
  "Bank Fees": {
    borderColor: "border-red-200",
    backgroundColor: "bg-red-500",
    textColor: "text-red-700",
    chipBackgroundColor: "bg-red-50",
  },
  Transfer: {
    borderColor: "border-purple-200",
    backgroundColor: "bg-purple-500",
    textColor: "text-purple-700",
    chipBackgroundColor: "bg-purple-50",
  },
  "Wallet Transfer": {
    borderColor: "border-indigo-200",
    backgroundColor: "bg-indigo-500",
    textColor: "text-indigo-700",
    chipBackgroundColor: "bg-indigo-50",
  },
  "Wallet Top-up": {
    borderColor: "border-violet-200",
    backgroundColor: "bg-violet-500",
    textColor: "text-violet-700",
    chipBackgroundColor: "bg-violet-50",
  },
  Processing: {
    borderColor: "border-amber-200",
    backgroundColor: "bg-amber-500",
    textColor: "text-amber-700",
    chipBackgroundColor: "bg-amber-50",
  },
  Success: {
    borderColor: "border-green-200",
    backgroundColor: "bg-green-500",
    textColor: "text-green-700",
    chipBackgroundColor: "bg-green-50",
  },
  Travel: {
    borderColor: "border-blue-200",
    backgroundColor: "bg-blue-500",
    textColor: "text-blue-700",
    chipBackgroundColor: "bg-blue-50",
  },
  Entertainment: {
    borderColor: "border-pink-200",
    backgroundColor: "bg-pink-500",
    textColor: "text-pink-700",
    chipBackgroundColor: "bg-pink-50",
  },
  Shopping: {
    borderColor: "border-indigo-200",
    backgroundColor: "bg-indigo-500",
    textColor: "text-indigo-700",
    chipBackgroundColor: "bg-indigo-50",
  },
  "Personal Care": {
    borderColor: "border-rose-200",
    backgroundColor: "bg-rose-500",
    textColor: "text-rose-700",
    chipBackgroundColor: "bg-rose-50",
  },
  Transportation: {
    borderColor: "border-cyan-200",
    backgroundColor: "bg-cyan-500",
    textColor: "text-cyan-700",
    chipBackgroundColor: "bg-cyan-50",
  },
  default: {
    borderColor: "border-slate-200",
    backgroundColor: "bg-slate-500",
    textColor: "text-slate-700",
    chipBackgroundColor: "bg-slate-50",
  },
};
