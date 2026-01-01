"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

// ✅ HYBRID MODE: Support cả Wallet và Bank transfers
import { transferBalance } from "@/lib/actions/wallet.actions";
import { getAvailableBalance } from "@/lib/actions/bankBalance.actions";
import { createTransfer } from "@/lib/actions/dwolla.actions";
import { createTransaction } from "@/lib/actions/transaction.actions";
import { getBank, getBankByAccountId, getBankByAppwriteItemId } from "@/lib/actions/user.actions";
import { saveRecipient } from "@/lib/actions/savedRecipient.actions";
import { decryptId } from "@/lib/utils";

import { BankDropdown } from "./BankDropdown";
import { Button } from "./ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(4, "Transfer note is too short"),
  amount: z.string().min(4, "Amount is too short"),
  senderBank: z.string().min(4, "Please select a valid bank account"),
  sharableId: z.string().min(8, "Please select a valid sharable Id"),
  source: z.enum(["wallet", "bank"], {
    required_error: "Please select a transfer source",
  }),
});

const PaymentTransferForm = ({ accounts }: PaymentTransferFormProps) => {
  const router = useRouter();
  const searchParams = useSearchParams(); // NEW
  const [isLoading, setIsLoading] = useState(false);
  const [shouldSaveRecipient, setShouldSaveRecipient] = useState(false);
  const [recipientNickname, setRecipientNickname] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      amount: "",
      senderBank: "",
      sharableId: "",
      source: "wallet", // Default to wallet
    },
  });

  // NEW: Pre-fill from URL
  useEffect(() => {
    const recipientParam = searchParams.get('recipient');
    if (recipientParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(recipientParam));
        if (parsed.email) {
          form.setValue('email', parsed.email);
          // If we ever save sharableId, we could set it here too
          // form.setValue('sharableId', parsed.sharableId);

          // Also disable source selection if it's strictly a bank transfer? 
          // Nah, let user decide.

          // Auto-open save recipient checkbox if we want? No, they already saved it.
          // Maybe check if nickname exists and populate it?
          if (parsed.nickname) {
            setRecipientNickname(parsed.nickname);
            setShouldSaveRecipient(true); // Though it's already saved, maybe this is cleaner to show?
            // Actually if it's "Quick Transfer" from "Saved Recipients", we shouldn't ask to save again.
            // But logic inside PaymentTransferForm might not know it's *already* saved unless we pass a flag.
            // For now, just filling email is good.
            setShouldSaveRecipient(false); // Ensure it is false
          }
        }
      } catch (e) {
        console.error("Failed to parse recipient", e);
      }
    }
  }, [searchParams, form]);


  // Helper to save recipient after successful transfer
  const saveRecipientIfNeeded = async (senderBank: any, receiverBank: any, data: z.infer<typeof formSchema>) => {
    if (!shouldSaveRecipient || !recipientNickname.trim()) {
      return;
    }

    try {
      const saveResult = await saveRecipient({
        userId: senderBank.userId, // ✅ FIXED: Save to SENDER's account
        nickname: recipientNickname,
        transferType: data.source === 'wallet' ? 'wallet' : 'bank',
        recipientUserId: receiverBank.userId,
        recipientEmail: data.email,
        recipientBankId: receiverBank.$id,
        bankName: receiverBank.name,
        accountMask: receiverBank.mask,
        createdFrom: 'normal_transfer'
      });

      if (saveResult.success) {
        alert(`✅ ${saveResult.message}`);
      } else {
        alert(`ℹ️ ${saveResult.message}`);
      }
    } catch (error) {
      console.error('Failed to save recipient:', error);
    }
  };

  const submit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);

    try {
      const receiverAccountId = decryptId(data.sharableId);
      const receiverBank = await getBankByAccountId({
        accountId: receiverAccountId,
      });

      // ✅ FIX: Get sender bank by appwriteItemId (data.senderBank is appwriteItemId from BankDropdown)
      const senderBank = await getBankByAppwriteItemId(data.senderBank);

      if (!receiverBank || !senderBank) {
        alert("Invalid bank account. Please check the shareable ID.");
        setIsLoading(false);
        return;
      }

      // ✅ HYBRID: User chọn Wallet hoặc Bank
      if (data.source === "wallet") {
        // 💰 WALLET TRANSFER - Instant, FREE
        const result = await transferBalance({
          senderId: senderBank.userId,
          receiverId: receiverBank.userId,
          amount: parseFloat(data.amount),
          description: data.name,
          email: data.email,
        });

        if (result && result.success) {
          // Save recipient if needed
          await saveRecipientIfNeeded(senderBank, receiverBank, data);

          alert(
            `✅ Instant Transfer Successful!\n\n` +
            `Your new wallet balance: $${result.newBalance.toFixed(2)}\n` +
            `Fee: $0 (FREE!)`
          );
          form.reset();
          router.push("/");
        }
      } else {
        // 🏦 BANK TRANSFER - 1-3 days, $0.25 fee

        // ✅ CHECK AVAILABLE BALANCE (actual - pending)
        const balanceInfo = await getAvailableBalance(data.senderBank);
        const transferAmount = parseFloat(data.amount);

        if (transferAmount > balanceInfo.available) {
          alert(
            `❌ Insufficient Available Balance!\n\n` +
            `Actual Balance: $${balanceInfo.actual.toFixed(2)}\n` +
            `Pending Transfers: -$${balanceInfo.pending.toFixed(2)}\n` +
            `Available: $${balanceInfo.available.toFixed(2)}\n\n` +
            `You are trying to transfer: $${transferAmount.toFixed(2)}\n\n` +
            `Please wait for pending transfers to complete or choose a lower amount.`
          );
          setIsLoading(false);
          return;
        }

        const transferParams = {
          sourceFundingSourceUrl: senderBank.fundingSourceUrl,
          destinationFundingSourceUrl: receiverBank.fundingSourceUrl,
          amount: data.amount,
        };

        const transfer = await createTransfer(transferParams);

        if (transfer) {
          const transaction = {
            name: data.name,
            amount: data.amount,
            senderId: senderBank.userId,
            senderBankId: senderBank.$id,
            receiverId: receiverBank.userId,
            receiverBankId: receiverBank.$id,
            email: data.email,
            category: "Transfer",
            pending: true,
          };

          const newTransaction = await createTransaction(transaction);

          if (newTransaction) {
            // Save recipient if needed
            await saveRecipientIfNeeded(senderBank, receiverBank, data);

            alert(
              `⏳ Bank Transfer Initiated!\n\n` +
              `Amount: $${transferAmount.toFixed(2)}\n` +
              `New Available Balance: $${(balanceInfo.available - transferAmount).toFixed(2)}\n\n` +
              `Your transfer will complete in 1-3 business days.\n` +
              `Fee: $0.25\n\n` +
              `You will receive a confirmation email.`
            );
            form.reset();
            router.push("/");
          }
        }
      }
    } catch (error: any) {
      console.error("Transfer failed:", error);
      alert(`❌ Transfer Failed!\n\n${error.message || "Unknown error occurred"}`);
    }

    setIsLoading(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="flex flex-col glass-panel p-6 md:p-8">

        {/* TRANSFER SOURCE SELECTOR */}
        <FormField
          control={form.control}
          name="source"
          render={({ field }) => (
            <FormItem className="border-b border-gray-200 pb-6 mb-6">
              <div className="payment-transfer_form-item">
                <FormLabel className="text-16 font-semibold text-gray-900">
                  Transfer Method
                </FormLabel>
                <FormDescription className="text-14 font-normal text-gray-600 mt-2">
                  Choose how you want to send money
                </FormDescription>
                <div className="mt-4">
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select transfer method" />
                      </SelectTrigger>
                      <SelectContent
                        className="!bg-gray-900 border border-gray-700 shadow-2xl"
                        style={{ backgroundColor: '#111827', color: '#fff' }}
                      >
                        <SelectItem value="wallet" className="hover:bg-gray-800 cursor-pointer">
                          <div className="flex items-center gap-3 py-2">
                            <span className="text-2xl">💰</span>
                            <div>
                              <p className="font-semibold text-white">Wallet Balance</p>
                              <p className="text-sm text-emerald-400">Instant • FREE</p>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="bank" className="hover:bg-gray-800 cursor-pointer">
                          <div className="flex items-center gap-3 py-2">
                            <span className="text-2xl">🏦</span>
                            <div>
                              <p className="font-semibold text-white">Bank Account</p>
                              <p className="text-sm text-gray-400">1-3 days • $0.25 fee</p>
                            </div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage className="text-12 text-red-500 mt-2" />
                </div>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="senderBank"
          render={() => (
            <FormItem className="border-t border-gray-200">
              <div className="payment-transfer_form-item pb-6 pt-5">
                <div className="payment-transfer_form-content">
                  <FormLabel className="text-14 font-medium text-gray-700">
                    Select Source Bank
                  </FormLabel>
                  <FormDescription className="text-12 font-normal text-gray-600">
                    Select the bank account you want to transfer funds from
                  </FormDescription>
                </div>
                <div className="flex w-full flex-col">
                  <FormControl>
                    <BankDropdown
                      accounts={accounts}
                      setValue={form.setValue}
                      otherStyles="!w-full"
                    />
                  </FormControl>
                  <FormMessage className="text-12 text-red-500" />
                </div>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="border-t border-gray-200">
              <div className="payment-transfer_form-item pb-6 pt-5">
                <div className="payment-transfer_form-content">
                  <FormLabel className="text-14 font-medium text-gray-700">
                    Transfer Note (Optional)
                  </FormLabel>
                  <FormDescription className="text-12 font-normal text-gray-600">
                    Please provide any additional information or instructions
                    related to the transfer
                  </FormDescription>
                </div>
                <div className="flex w-full flex-col">
                  <FormControl>
                    <Textarea
                      placeholder="Write a short note here"
                      className="input-class"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-12 text-red-500" />
                </div>
              </div>
            </FormItem>
          )}
        />

        <div className="payment-transfer_form-details">
          <h2 className="text-18 font-semibold text-gray-900">
            Bank account details
          </h2>
          <p className="text-16 font-normal text-gray-600">
            Enter the bank account details of the recipient
          </p>
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="border-t border-gray-200">
              <div className="payment-transfer_form-item py-5">
                <FormLabel className="text-14 w-full max-w-[280px] font-medium text-gray-700">
                  Recipient&apos;s Email Address
                </FormLabel>
                <div className="flex w-full flex-col">
                  <FormControl>
                    <Input
                      placeholder="ex: johndoe@gmail.com"
                      className="input-class"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-12 text-red-500" />
                </div>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sharableId"
          render={({ field }) => (
            <FormItem className="border-t border-gray-200">
              <div className="payment-transfer_form-item pb-5 pt-6">
                <FormLabel className="text-14 w-full max-w-[280px] font-medium text-gray-700">
                  Receiver&apos;s Plaid Sharable Id
                </FormLabel>
                <div className="flex w-full flex-col">
                  <FormControl>
                    <Input
                      placeholder="Enter the public account number"
                      className="input-class"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-12 text-red-500" />
                </div>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem className="border-y border-gray-200">
              <div className="payment-transfer_form-item py-5">
                <FormLabel className="text-14 w-full max-w-[280px] font-medium text-gray-700">
                  Amount
                </FormLabel>
                <div className="flex w-full flex-col">
                  <FormControl>
                    <Input
                      placeholder="ex: 5.00"
                      className="input-class"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-12 text-red-500" />
                </div>
              </div>
            </FormItem>
          )}
        />

        {/* Save Recipient Section */}
        <div className="border-t border-gray-200">
          <div className="payment-transfer_form-item py-5">
            <div className="w-full max-w-[280px]">
              <h3 className="text-14 font-medium text-gray-700 mb-2">Save Recipient</h3>
              <p className="text-12 text-gray-600">Quick access for future transfers</p>
            </div>
            <div className="flex w-full flex-col gap-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={shouldSaveRecipient}
                  onChange={(e) => setShouldSaveRecipient(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-14 font-medium text-gray-700 group-hover:text-emerald-600 transition-colors">
                    💾 Save this recipient for future transfers
                  </span>
                  <p className="text-12 text-gray-500 mt-1">
                    No need to enter their details again next time
                  </p>
                </div>
              </label>

              {shouldSaveRecipient && (
                <div>
                  <label className="text-14 font-medium text-gray-700 mb-2 block">
                    Recipient Nickname
                    <span className="text-gray-500 font-normal ml-1">(for your reference)</span>
                  </label>
                  <Input
                    type="text"
                    value={recipientNickname}
                    onChange={(e) => setRecipientNickname(e.target.value)}
                    placeholder="e.g. Mom, Landlord, Coffee Shop..."
                    className="input-class"
                  />
                  <p className="text-12 text-gray-500 mt-2">
                    💡 This name is just for you  - it doesn't have to match their real name
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="payment-transfer_btn-box">
          <Button type="submit" className="payment-transfer_btn">
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" /> &nbsp; Sending...
              </>
            ) : (
              "Transfer Funds"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default PaymentTransferForm;
