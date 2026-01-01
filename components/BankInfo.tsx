"use client";

import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";

import {
  cn,
  formUrlQuery,
  formatAmount,
} from "@/lib/utils";

const BankInfo = ({ account, appwriteItemId, type }: BankInfoProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isActive = appwriteItemId === account?.appwriteItemId;

  const handleBankChange = () => {
    const newUrl = formUrlQuery({
      params: searchParams.toString(),
      key: "id",
      value: account?.appwriteItemId,
    });
    router.push(newUrl, { scroll: false });
  };

  return (
    <div
      onClick={handleBankChange}
      className={cn(`bank-info glass-panel !rounded-xl`, {
        "shadow-sm border-success-500": type === "card" && isActive,
        "hover:shadow-sm cursor-pointer": type === "card",
      })}
    >
      <figure
        className="flex-center h-fit rounded-full bg-primary-500/20"
      >
        <Image
          src="/icons/connect-bank.svg"
          width={20}
          height={20}
          alt={account.subtype}
          className="m-2 min-w-5 brightness-[3]"
        />
      </figure>
      <div className="flex w-full flex-1 flex-col justify-center gap-1">
        <div className="bank-info_content">
          <h2
            className={cn("text-16 line-clamp-1 flex-1 font-bold", {
              "text-success-500": isActive,
              "text-white": !isActive,
            })}
          >
            {account.name}
          </h2>
          {type === "full" && (
            <p
              className="text-12 rounded-full px-3 py-1 font-medium bg-primary-700/40 text-success-500"
            >
              {account.subtype}
            </p>
          )}
        </div>

        <p className="text-16 font-medium text-gray-600">
          {formatAmount(account.currentBalance)}
        </p>
      </div>
    </div>
  );
};

export default BankInfo;
