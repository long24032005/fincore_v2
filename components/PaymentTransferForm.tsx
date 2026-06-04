"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Wallet, Building2, ArrowRight, User, Hash, DollarSign, FileText, CheckCircle2, Share2, Download } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';

// ✅ HYBRID MODE: Support Wallet, Bank, and Bank→Wallet transfers
import { transferBalance, bankToWalletTransfer, getUserByWalletId, walletToBank } from "@/lib/actions/wallet.actions";
import { getAvailableBalance } from "@/lib/actions/bankBalance.actions";
import { createTransfer } from "@/lib/actions/dwolla.actions";
import { createTransaction } from "@/lib/actions/transaction.actions";
import { getBank, getBankByAccountId, getBankByAppwriteItemId, getUserInfo, getLoggedInUser, getUserByIdentifier } from "@/lib/actions/user.actions";
import { saveRecipient } from "@/lib/actions/savedRecipient.actions";
import { decryptId, formatAmount, extractUserId, extractId } from "@/lib/utils";

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

// ✅ Schema with conditional senderBank validation
const formSchema = z.object({
  name: z.string().min(4, "Nội dung chuyển tiền quá ngắn (tối thiểu 4 ký tự)"),
  amount: z.string().min(1, "Vui lòng nhập số tiền"),
  senderBank: z.string().optional(), // ✅ Optional - only required if source === 'bank'
  sharableId: z.string().min(8, "Vui lòng nhập ID người nhận hợp lệ"),
  source: z.enum(["wallet", "bank"], {
    required_error: "Vui lòng chọn nguồn chuyển tiền",
  }),
}).refine((data) => {
  // If source is 'bank', senderBank must be provided and valid
  if (data.source === 'bank') {
    return data.senderBank && data.senderBank.length >= 4;
  }
  return true; // Wallet transfers don't need senderBank
}, {
  message: "Vui lòng chọn tài khoản ngân hàng để chuyển tiền",
  path: ["senderBank"],
});

const PaymentTransferForm = ({ accounts }: PaymentTransferFormProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [shouldSaveRecipient, setShouldSaveRecipient] = useState(false);
  const [transferSource, setTransferSource] = useState<"wallet" | "bank">("wallet");
  const [successData, setSuccessData] = useState<any>(null); // State for success modal

  // Real-time recipient lookup states
  const [recipientInfo, setRecipientInfo] = useState<any>(null);
  const [isLookingUpRecipient, setIsLookingUpRecipient] = useState(false);
  const [recipientNickname, setRecipientNickname] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      amount: "",
      senderBank: "",
      sharableId: "",
      source: "wallet",
    },
  });

  // Pre-fill from URL (for Quick Transfer from Saved Recipients)
  useEffect(() => {
    const recipientParam = searchParams.get('recipient');
    if (recipientParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(recipientParam));
        if (parsed.sharableId) {
          form.setValue('sharableId', parsed.sharableId);
        }
        // Auto-disable save checkbox if coming from saved recipient
        if (parsed.nickname) {
          setShouldSaveRecipient(false);
        }
      } catch (e) {
        console.error("Failed to parse recipient", e);
      }
    }
  }, [searchParams, form]);

  // Real-time recipient lookup (debounced)
  useEffect(() => {
    const sharableId = form.watch('sharableId');

    if (!sharableId || sharableId.trim().length < 8) {
      setRecipientInfo(null);
      setRecipientNickname("");
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLookingUpRecipient(true);
      try {
        console.log('🔍 [Normal Transfer] Starting recipient lookup...');
        console.log('📥 Raw sharableId:', sharableId);

        const sanitizedId = extractId(sharableId);
        console.log('🧹 Sanitized ID:', sanitizedId);

        if (!sanitizedId) {
          console.log('❌ Sanitization returned null/empty');
          setRecipientInfo(null);
          setRecipientNickname("");
          return;
        }

        console.log('🔍 Calling getUserByIdentifier with:', sanitizedId);
        const resolvedUser = await getUserByIdentifier(sanitizedId);
        console.log('📤 getUserByIdentifier result:', resolvedUser);

        if (resolvedUser) {
          const fullName = `${resolvedUser.firstName} ${resolvedUser.lastName}`;
          console.log('✅ User resolved:', fullName);

          // Determine account type (wallet or bank)
          let accountType = 'wallet';
          let bankDetails = null;

          // Check if it's a bank shareable ID
          try {
            const accountId = decryptId(sanitizedId);
            console.log('🔓 Trying to decrypt as bank ID, accountId:', accountId);
            const bank = await getBankByAccountId({ accountId });
            if (bank) {
              accountType = 'bank';
              bankDetails = bank;
              console.log('🏦 Bank details found:', bank.name);
            }
          } catch (e) {
            console.log('💰 Not a bank ID, treating as wallet ID');
          }

          setRecipientInfo({
            ...resolvedUser,
            fullName,
            accountType,
            bankDetails
          });
          setRecipientNickname(fullName); // Auto-fill nickname
        } else {
          console.log('❌ No user found');
          setRecipientInfo(null);
          setRecipientNickname("");
        }
      } catch (error) {
        console.error('💥 Failed to lookup recipient:', error);
        setRecipientInfo(null);
        setRecipientNickname("");
      } finally {
        setIsLookingUpRecipient(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [form.watch('sharableId')]);

  const handleShare = async () => {
    if (!successData) return;

    const shareText = `Biên lai chuyển tiền fincore\nSố tiền: ${formatAmount(parseFloat(successData.amount))}\nĐến: ${successData.to}\nMã giao dịch: ${successData.id}\nThời gian: ${successData.time}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Biên lai fincore',
          text: shareText,
        });
      } catch (err) {
        console.log('Share cancelled or failed', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        toast.success('Đã sao chép thông tin biên lai vào clipboard!');
      } catch (err) {
        toast.error('Không thể sao chép vào clipboard');
      }
    }
  };

  const handleSave = async () => {
    const receiptElement = document.getElementById('receipt-modal-content');
    if (!receiptElement) return;

    try {
      const canvas = await html2canvas(receiptElement, {
        backgroundColor: '#0f1012', // Match modal background
        scale: 2 // Higher resolution
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = image;
      link.download = `fincore-bienlai-${successData.id.slice(-8)}.png`;
      link.click();

      toast.success('Đã lưu biên lai thành công!');
    } catch (err) {
      console.error('Save failed:', err);
      toast.error('Không thể lưu ảnh biên lai');
    }
  };

  // ✨ AUTO-RESOLVE & SAFE SAVE LOGIC (Using Advanced Resolution)
  const saveRecipientIfNeeded = async (
    data: z.infer<typeof formSchema>,
    senderUserId: any,
    receiverIdentifier: string, // Email, Wallet ID, or Bank Shareable ID entered by user
    receiverBank?: any
  ) => {
    if (!shouldSaveRecipient) {
      console.log('⏭️ Skipping recipient save (checkbox not checked)');
      return;
    }

    // ✅ NEW: Validate nickname is not empty
    if (!recipientNickname || recipientNickname.trim() === '') {
      console.error('❌ Nickname is required when saving recipient');
      toast.error('Vui lòng nhập biệt danh cho người nhận');
      return;
    }

    try {
      // 🔧 STEP A: Sanitize Sender ID
      const sanitizedSenderId = extractUserId(senderUserId);

      if (!sanitizedSenderId) {
        console.error('❌ Invalid sender ID - cannot save recipient');
        return;
      }

      if (!receiverIdentifier || receiverIdentifier.trim() === '') {
        console.error('❌ Invalid receiver identifier - cannot save recipient');
        return;
      }

      console.log('🔍 Auto-resolving recipient details for:', receiverIdentifier);

      // 🎯 STEP B: Resolve the User (The "Magic" Step using advanced logic)
      const resolvedUser = await getUserByIdentifier(receiverIdentifier);

      if (resolvedUser) {
        // ✅ User found - Save with USER-PROVIDED nickname
        const recipientName = `${resolvedUser.firstName} ${resolvedUser.lastName}`;

        console.log('✅ Recipient auto-resolved:', {
          id: resolvedUser.$id,
          name: recipientName,
          nickname: recipientNickname, // ✨ User's custom nickname
          walletId: resolvedUser.walletId,
          email: resolvedUser.email
        });

        const saveResult = await saveRecipient({
          userId: sanitizedSenderId,
          nickname: recipientNickname.trim(), // ✨ Use USER'S nickname (not auto-generated)
          transferType: data.source === 'wallet' ? 'wallet' : 'bank',
          recipientUserId: resolvedUser.$id, // ✨ Real DB ID
          recipientWalletId: resolvedUser.walletId, // ✨ Real Wallet ID
          recipientEmail: resolvedUser.email, // ✨ Real Email
          recipientName: recipientName, // ✨ Real Full Name
          recipientBankId: receiverBank?.$id,
          bankName: receiverBank?.name,
          accountMask: receiverBank?.mask,
          createdFrom: 'normal_transfer'
        });

        if (saveResult.success) {
          console.log(`✅ Recipient saved with nickname: ${recipientNickname}`);
          toast.success(saveResult.message);
        } else {
          console.log(`ℹ️ ${saveResult.message}`);
          toast(saveResult.message, { icon: 'ℹ️' });
        }
      } else {
        // ⚠️ External/Not Found - Skip save (external transfers)
        console.log('⚠️ Recipient not found in system (external transfer) - skipping save');
      }
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
      toast.error('Không thể lưu người nhận');
    }
  };

  const submit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);

    try {
      // 🔧 STEP A: Sanitize Inputs Immediately
      const receiverIdRaw = extractId(data.sharableId);

      console.log('🔍 Sanitized receiverId:', receiverIdRaw);

      if (!receiverIdRaw || receiverIdRaw.trim() === '') {
        alert("❌ ID người nhận không hợp lệ. Vui lòng nhập đúng định danh.");
        setIsLoading(false);
        return;
      }

      // 🎯 STEP B: Resolve the User (The "Magic" Step)
      console.log('🔍 Resolving user from identifier:', receiverIdRaw);
      const resolvedUser = await getUserByIdentifier(receiverIdRaw);

      // Try to decode as a Bank Shareable ID
      let receiverBank = null;
      let receiverWalletUser = null;
      let isWalletTransfer = false;

      try {
        const receiverAccountId = decryptId(receiverIdRaw);
        receiverBank = await getBankByAccountId({ accountId: receiverAccountId });
      } catch (e) {
        console.log("Not a bank shareable ID, checking if Wallet ID...");
      }

      // If not a bank, check if it's a Wallet ID
      if (!receiverBank) {
        receiverWalletUser = await getUserByWalletId(receiverIdRaw);
        if (receiverWalletUser) {
          isWalletTransfer = true;
          console.log("Detected Wallet ID, switching to Bank→Wallet flow");
        }
      }

      // ═══════════════════════════════════════════════════════════════════
      // HANDLE WALLET TRANSFERS (No senderBank needed)
      // ═══════════════════════════════════════════════════════════════════
      if (data.source === "wallet") {
        // For wallet transfers, we don't need senderBank - the backend uses getLoggedInUser
        if (!receiverBank && !receiverWalletUser) {
          alert("❌ ID người nhận không hợp lệ. Vui lòng kiểm tra lại Wallet ID hoặc Bank Shareable ID.");
          setIsLoading(false);
          return;
        }

        // 💰 WALLET TRANSFER - Instant, FREE
        if (isWalletTransfer) {
          // 🔧 STEP C: Prepare Payload (Must use String ID)
          const receiverUserIdStr = extractId(receiverWalletUser!.$id);

          // Wallet → Wallet (receiver is wallet user)
          const result = await transferBalance({
            senderId: "", // Backend overrides with authenticated user
            receiverId: receiverUserIdStr, // ✅ Sanitized String ID
            amount: parseFloat(data.amount),
            description: data.name,
          });

          if (result && result.success) {
            // 🎯 STEP D: Auto-Save (Only if saveRecipient is true)
            const currentUser = await getLoggedInUser();
            if (currentUser && shouldSaveRecipient) {
              // Use resolvedUser if available, otherwise fallback to receiverWalletUser
              const userToSave = resolvedUser || receiverWalletUser;
              if (userToSave) {
                await saveRecipientIfNeeded(data, currentUser.$id, receiverIdRaw, undefined);
              }
            }


            setSuccessData({
              amount: parseFloat(data.amount).toFixed(2),
              to: `${receiverWalletUser!.firstName} ${receiverWalletUser!.lastName}`,
              toBank: 'Ví fincore',
              toId: receiverWalletUser!.walletId,
              from: 'Số dư Ví',
              fromDetail: 'Ví fincore',
              fromId: currentUser?.walletId || 'N/A',
              senderName: `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`,
              id: result.transactionId || 'N/A',
              time: new Date().toLocaleString()
            });
            // Don't navigate away - success modal will show
          } else {
            alert(`❌ Chuyển tiền thất bại!\n\n${result?.message || "Lỗi không xác định"}`);
          }
        } else {
          // Wallet → Bank Account
          // Need to determine if this is:
          // A) WITHDRAWAL: User withdrawing to their OWN bank account
          // B) P2P TRANSFER: User sending to another user's bank account

          // Get the bank's appwriteItemId for the withdrawal
          const bankAccountId = receiverBank!.appwriteItemId || receiverBank!.$id || receiverBank!.id;

          // Check if this is the user's own bank (self-withdrawal)
          // We detect this by checking if the bank's shareable ID starts with their user ID prefix
          // or if it's in the user's accounts list
          const isOwnBank = accounts.some(
            (acc: Account) => acc.appwriteItemId === bankAccountId || acc.id === receiverBank!.accountId
          );

          if (isOwnBank) {
            // 💸 WALLET → OWN BANK (Withdrawal)
            console.log("Detected Wallet → Own Bank withdrawal flow");

            const result = await walletToBank({
              destinationBankId: bankAccountId,
              amount: parseFloat(data.amount),
              description: data.name || "Rút tiền từ Ví",
            });

            if (result && result.success) {
              // Get current user for success modal display
              const senderUser = await getLoggedInUser();
              const receiverBankDetails = await getBank({ documentId: bankAccountId });

              setSuccessData({
                amount: parseFloat(data.amount).toFixed(2),
                to: `${senderUser?.firstName || ''} ${senderUser?.lastName || ''}`,
                toBank: receiverBankDetails?.name || 'Tài khoản ngân hàng',
                toId: receiverBankDetails?.shareableId || 'N/A',
                from: 'Số dư Ví',
                fromDetail: 'Ví fincore',
                fromId: senderUser?.walletId || 'N/A',
                senderName: `${senderUser?.firstName || ''} ${senderUser?.lastName || ''}`,
                id: result.transactionId || 'N/A',
                time: new Date().toLocaleString()
              });
              // Don't navigate away - success modal will show
            } else {
              alert(`❌ Rút tiền thất bại!\n\n${result?.message || "Lỗi không xác định"}`);
            }
          } else {
            // 💰 WALLET → ANOTHER USER'S BANK (External Transfer)
            // 🔧 STEP C: Prepare Payload (Must use String IDs)
            // 🔴 CRITICAL FIX: Pass receiverBankId to enforce Bank routing (NOT P2P wallet)
            const receiverUserIdStr = extractId(receiverBank!.userId);
            const receiverBankIdStr = extractId(receiverBank!.appwriteItemId || receiverBank!.$id);

            const result = await transferBalance({
              senderId: "", // Backend overrides with authenticated user
              receiverId: receiverUserIdStr, // ✅ Sanitized String ID
              receiverBankId: receiverBankIdStr, // 🔴 CRITICAL: Forces Wallet→Bank routing
              amount: parseFloat(data.amount),
              description: data.name,
            });

            if (result && result.success) {
              // 🎯 STEP D: Auto-Save (Only if saveRecipient is true)
              const currentUser = await getLoggedInUser();
              if (currentUser && shouldSaveRecipient) {
                // Use resolvedUser if available (has full user data)
                if (resolvedUser) {
                  await saveRecipientIfNeeded(data, currentUser.$id, receiverIdRaw, receiverBank);
                }
              }

              // Get receiver user for success modal display
              const receiverUser = await getUserInfo({ userId: receiverUserIdStr });

              setSuccessData({
                amount: parseFloat(data.amount).toFixed(2),
                to: `${receiverUser?.firstName || 'Người nhận'} ${receiverUser?.lastName || ''}`,
                toBank: receiverBank?.name || 'Tài khoản ngân hàng',
                toId: receiverBank?.shareableId || 'N/A',
                from: 'Số dư Ví',
                fromDetail: 'Ví fincore',
                fromId: currentUser?.walletId || 'N/A',
                senderName: `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`,
                id: result.transactionId || 'N/A',
                time: new Date().toLocaleString()
              });
              // Don't navigate away - success modal will show
            } else {
              alert(`❌ Chuyển tiền thất bại!\n\n${result?.message || "Lỗi không xác định"}`);
            }
          }
        }
      } else {
        // ═══════════════════════════════════════════════════════════════════
        // HANDLE BANK TRANSFERS (senderBank required)
        // ═══════════════════════════════════════════════════════════════════
        if (!data.senderBank) {
          alert("❌ Vui lòng chọn ngân hàng nguồn để thực hiện chuyển khoản.");
          setIsLoading(false);
          return;
        }

        const senderBank = await getBankByAppwriteItemId(data.senderBank);

        if (!senderBank) {
          alert("❌ Ngân hàng không hợp lệ. Vui lòng chọn lại tài khoản ngân hàng.");
          setIsLoading(false);
          return;
        }

        if (!receiverBank && !receiverWalletUser) {
          alert("❌ ID người nhận không hợp lệ. Vui lòng kiểm tra lại Wallet ID hoặc Bank Shareable ID.");
          setIsLoading(false);
          return;
        }

        // 🏦 BANK as source
        const balanceInfo = await getAvailableBalance(data.senderBank);
        const transferAmount = parseFloat(data.amount);

        if (transferAmount > balanceInfo.available) {
          alert(
            `❌ Số dư khả dụng không đủ!\n\n` +
            `Số dư thực: ${formatAmount(balanceInfo.actual)}\n` +
            `Giao dịch đang chờ: -${formatAmount(balanceInfo.pending)}\n` +
            `Khả dụng: ${formatAmount(balanceInfo.available)}\n\n` +
            `Bạn đang muốn chuyển: ${formatAmount(transferAmount)}\n\n` +
            `Vui lòng chờ các giao dịch đang chờ hoàn tất hoặc nhập số tiền nhỏ hơn.`
          );
          setIsLoading(false);
          return;
        }

        if (isWalletTransfer) {
          // 🏦➡️💰 BANK → WALLET (Top-up flow)
          console.log("Executing Bank → Wallet transfer...");

          // 🔧 STEP C: Prepare Payload (Must use String ID)
          const result = await bankToWalletTransfer({
            senderId: senderBank.userId,
            senderBankId: senderBank.$id,
            receiverWalletId: receiverIdRaw, // ✅ Sanitized String (Wallet ID)
            amount: transferAmount,
            description: data.name || "Nạp tiền từ ngân hàng vào Ví",
          });

          if (result.success) {
            // 🎯 STEP D: Auto-Save (Only if saveRecipient is true)
            if (shouldSaveRecipient && resolvedUser) {
              await saveRecipientIfNeeded(data, senderBank.userId, receiverIdRaw, undefined);
            }

            // Get current user for success modal display
            const senderUser = await getUserInfo({ userId: senderBank.userId });
            const senderBankDetails = await getBank({ documentId: senderBank.$id });

            setSuccessData({
              amount: transferAmount.toFixed(2),
              to: `${receiverWalletUser!.firstName} ${receiverWalletUser!.lastName}`,
              toBank: 'Ví fincore',
              toId: receiverWalletUser!.walletId,
              from: senderBankDetails?.name || 'Tài khoản ngân hàng',
              fromDetail: senderBankDetails?.subtype || 'Tài khoản thanh toán',
              fromId: senderBankDetails?.shareableId || 'N/A',
              senderName: `${senderUser?.firstName || ''} ${senderUser?.lastName || ''}`,
              id: result.transactionId || 'N/A',
              time: new Date().toLocaleString()
            });
            // Don't navigate away - success modal will show
          } else {
            alert(`❌ Chuyển tiền thất bại!\n\n${result.message}`);
          }
        } else {
          // 🏦➡️🏦 BANK → BANK (Dwolla flow)
          // 🔧 STEP C: Prepare Payload (Must use String IDs)
          const senderUserIdStr = extractId(senderBank.userId);
          const receiverUserIdStr = extractId(receiverBank!.userId);
          const senderBankIdStr = extractId(senderBank.$id);
          const receiverBankIdStr = extractId(receiverBank!.$id);

          const transferParams = {
            sourceFundingSourceUrl: senderBank.fundingSourceUrl,
            destinationFundingSourceUrl: receiverBank!.fundingSourceUrl,
            amount: data.amount,
          };

          const transfer = await createTransfer(transferParams);

          if (transfer) {
            const transaction = {
              name: data.name,
              amount: data.amount,
              senderId: senderUserIdStr, // ✅ Sanitized String ID
              senderBankId: senderBankIdStr, // ✅ Sanitized String ID
              receiverId: receiverUserIdStr, // ✅ Sanitized String ID
              receiverBankId: receiverBankIdStr, // ✅ Sanitized String ID
              category: "Transfer",
              pending: true,
            };

            const newTransaction = await createTransaction(transaction);

            if (newTransaction) {
              // 🎯 STEP D: Auto-Save (Only if saveRecipient is true)
              if (shouldSaveRecipient && resolvedUser) {
                await saveRecipientIfNeeded(data, senderBank.userId, receiverIdRaw, receiverBank);
              }

              // Get sender and receiver users for success modal display
              const senderUser = await getUserInfo({ userId: senderBank.userId });
              const receiverUser = await getUserInfo({ userId: receiverUserIdStr });
              const senderBankDetails = await getBank({ documentId: senderBank.$id });

              setSuccessData({
                amount: transferAmount.toFixed(2),
                to: `${receiverUser?.firstName || 'Người nhận'} ${receiverUser?.lastName || ''}`,
                toBank: receiverBank?.name || 'Tài khoản ngân hàng',
                toId: receiverBank?.shareableId || 'N/A',
                from: senderBankDetails?.name || 'Tài khoản ngân hàng',
                fromDetail: senderBankDetails?.subtype || 'Tài khoản thanh toán',
                fromId: senderBankDetails?.shareableId || 'N/A',
                senderName: `${senderUser?.firstName || ''} ${senderUser?.lastName || ''}`,
                id: newTransaction.$id || 'N/A',
                time: new Date().toLocaleString()
              });
              // Don't navigate away - success modal will show
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Transfer failed:", error);
      alert(`❌ Chuyển tiền thất bại!\n\n${error.message || "Đã xảy ra lỗi không xác định"}`);
    }

    setIsLoading(false);
  };

  const handleSourceChange = (source: "wallet" | "bank") => {
    setTransferSource(source);
    form.setValue("source", source);
  };

  return (
    <>
      {/* Success Modal */}
      {successData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div id="receipt-modal-content" className="bg-[#0f1012] border border-gray-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="bg-emerald-500/10 p-6 flex flex-col items-center border-b border-gray-800">
              <div className="size-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 ring-2 ring-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-20 font-bold text-white mb-1">Chuyển tiền thành công!</h2>
              <p className="text-14 text-gray-400">Giao dịch đã hoàn tất</p>

              <div className="mt-6 text-center">
                <p className="text-14 text-gray-400 mb-1">Tổng số tiền</p>
                <p className="text-36 font-bold text-white tracking-tight">
                  {formatAmount(parseFloat(successData.amount))}
                </p>
              </div>
            </div>

            {/* Receipt Details */}
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-800/50">
                <span className="text-14 text-gray-400">Đến</span>
                <div className="text-right flex flex-col items-end">
                  <p className="text-14 font-semibold text-white">{successData.to}</p>
                  <p className="text-12 text-emerald-400 font-medium">{successData.toBank}</p>
                  {successData.toId && (
                    <p className="text-12 text-gray-500 font-mono mt-0.5">
                      {successData.toBank === 'Ví fincore' ? successData.toId : `Tài khoản • ${successData.toId}`}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-800/50">
                <span className="text-14 text-gray-400">Từ</span>
                <div className="text-right flex flex-col items-end">
                  <p className="text-14 font-semibold text-white">{successData.senderName}</p>
                  <p className="text-12 text-emerald-400 font-medium">{successData.from}</p>
                  {successData.fromId && (
                    <p className="text-12 text-gray-500 font-mono mt-0.5">
                      {successData.fromId}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-800/50">
                <span className="text-14 text-gray-400">Thời gian</span>
                <span className="text-14 text-gray-300">{successData.time}</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-14 text-gray-400">Mã giao dịch</span>
                <span className="text-12 font-mono text-gray-500 uppercase tracking-wider">{successData.id.slice(-8)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 pt-2 grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  form.reset();
                  setSuccessData(null);
                }}
                className="col-span-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
              >
                Hoàn tất
              </button>
              <button
                onClick={handleShare}
                className="flex items-center justify-center gap-2 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-xl transition-colors border border-gray-700"
              >
                <Share2 className="w-4 h-4" /> Chia sẻ
              </button>
              <button
                onClick={handleSave}
                className="flex items-center justify-center gap-2 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-xl transition-colors border border-gray-700"
              >
                <Download className="w-4 h-4" /> Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-6">

          {/* ═══════════════════════════════════════════════════════════════════
            SECTION 1: TRANSFER METHOD TOGGLE
        ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 flex items-center justify-center">
                <ArrowRight className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Phương thức chuyển tiền</h3>
                <p className="text-sm text-gray-400">Chọn cách bạn muốn gửi tiền</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Wallet Option */}
              <button
                type="button"
                onClick={() => handleSourceChange("wallet")}
                className={`relative p-4 rounded-xl border-2 transition-all duration-300 group ${transferSource === "wallet"
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
                  }`}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${transferSource === "wallet"
                    ? "bg-emerald-500/20"
                    : "bg-gray-700/50 group-hover:bg-gray-700"
                    }`}>
                    <Wallet className={`w-6 h-6 ${transferSource === "wallet" ? "text-emerald-400" : "text-gray-400"
                      }`} />
                  </div>
                  <div className="text-center">
                    <p className={`font-semibold ${transferSource === "wallet" ? "text-white" : "text-gray-300"
                      }`}>Số dư Ví</p>
                  </div>
                </div>
                {transferSource === "wallet" && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </button>

              {/* Bank Option */}
              <button
                type="button"
                onClick={() => handleSourceChange("bank")}
                className={`relative p-4 rounded-xl border-2 transition-all duration-300 group ${transferSource === "bank"
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
                  }`}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${transferSource === "bank"
                    ? "bg-emerald-500/20"
                    : "bg-gray-700/50 group-hover:bg-gray-700"
                    }`}>
                    <Building2 className={`w-6 h-6 ${transferSource === "bank" ? "text-emerald-400" : "text-gray-400"
                      }`} />
                  </div>
                  <div className="text-center">
                    <p className={`font-semibold ${transferSource === "bank" ? "text-white" : "text-gray-300"
                      }`}>Tài khoản ngân hàng</p>
                  </div>
                </div>
                {transferSource === "bank" && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </button>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
            SECTION 2: SOURCE BANK SELECTION (Only for Bank transfers)
        ═══════════════════════════════════════════════════════════════════ */}
          {transferSource === "bank" && (
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Tài khoản ngân hàng nguồn</h3>
                  <p className="text-sm text-gray-400">Chọn ngân hàng để chuyển tiền từ đó</p>
                </div>
              </div>

              <FormField
                control={form.control}
                name="senderBank"
                render={() => (
                  <FormItem>
                    <FormControl>
                      <BankDropdown
                        accounts={accounts}
                        setValue={form.setValue}
                        otherStyles="!w-full"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-sm mt-2" />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
            SECTION 3: RECIPIENT ID (CRITICAL - HIGHLIGHTED)
        ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-gradient-to-br from-gray-900/80 to-gray-900/50 border-2 border-emerald-500/30 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden">
            {/* Glow effect */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />

            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/30 to-emerald-600/30 flex items-center justify-center">
                  <User className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    Thông tin người nhận
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Bắt buộc</span>
                  </h3>
                  <p className="text-sm text-gray-400">Nhập định danh duy nhất của người nhận</p>
                </div>
              </div>

              <FormField
                control={form.control}
                name="sharableId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300 font-medium flex items-center gap-2">
                      <Hash className="w-4 h-4 text-emerald-400" />
                      Wallet ID / Mã tài khoản người nhận
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="Nhập Wallet ID hoặc Bank Shareable ID"
                          className="bg-gray-800/80 border-gray-700 text-white placeholder:text-gray-500 h-12 pl-4 pr-4 rounded-xl focus:border-emerald-500 focus:ring-emerald-500/20 transition-all"
                          {...field}
                        />
                        {isLookingUpRecipient && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription className="text-gray-500 text-xs mt-2">
                      💡 Thông tin người nhận sẽ hiển thị tự động khi bạn nhập
                    </FormDescription>
                    <FormMessage className="text-red-400 text-sm" />

                    {/* Real-time Recipient Preview Card */}
                    {recipientInfo && !isLookingUpRecipient && (
                      <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 animate-in fade-in duration-200">
                        <div className="flex items-center gap-3">
                          <div className="flex-center size-12 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-lg">
                            {recipientInfo.firstName[0]}{recipientInfo.lastName[0]}
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-semibold text-16">{recipientInfo.fullName}</p>
                            <p className="text-gray-400 text-14">{recipientInfo.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {recipientInfo.accountType === 'wallet' ? (
                                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                                  💰 Tài khoản Ví
                                </span>
                              ) : (
                                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                                  🏦 {recipientInfo.bankDetails?.name || 'Tài khoản ngân hàng'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Not Found State */}
                    {!recipientInfo && !isLookingUpRecipient && field.value && field.value.length >= 8 && (
                      <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                        <p className="text-yellow-400 text-14">⚠️ Không tìm thấy người nhận. Vui lòng kiểm tra lại ID.</p>
                      </div>
                    )}
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
            SECTION 4: PAYMENT DETAILS (Amount + Note)
        ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Chi tiết thanh toán</h3>
                <p className="text-sm text-gray-400">Nhập số tiền và nội dung giao dịch</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Amount Field */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300 font-medium flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-purple-400" />
                      Số tiền
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">đ</span>
                        <Input
                          type="number"
                          step="1"
                          min="1"
                          placeholder="Nhập số tiền"
                          className="bg-gray-800/80 border-gray-700 text-white placeholder:text-gray-500 h-12 pl-8 pr-4 rounded-xl focus:border-purple-500 focus:ring-purple-500/20 text-lg font-semibold"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400 text-sm" />
                  </FormItem>
                )}
              />

              {/* Note Field */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300 font-medium flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-400" />
                      Nội dung chuyển tiền
                      <span className="text-xs text-gray-500 font-normal">(Tuỳ chọn)</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Nội dung giao dịch này là gì? vd: Tiền thuê nhà, Ăn tối, Quà tặng..."
                        className="bg-gray-800/80 border-gray-700 text-white placeholder:text-gray-500 rounded-xl focus:border-purple-500 focus:ring-purple-500/20 min-h-[80px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-sm" />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
            SECTION 5: SAVE RECIPIENT (Optional)
        ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm">
            <label className="flex items-start gap-4 cursor-pointer group">
              <div className="pt-1">
                <input
                  type="checkbox"
                  checked={shouldSaveRecipient}
                  onChange={(e) => setShouldSaveRecipient(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-emerald-500 focus:ring-emerald-500/20 cursor-pointer"
                />
              </div>
              <div className="flex-1">
                <p className="text-white font-medium group-hover:text-emerald-400 transition-colors">
                  💾 Lưu người này vào danh bạ của tôi
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  Truy cập nhanh lần sau - không cần nhập lại ID
                </p>
              </div>
            </label>

            {/* Nickname Input - Appears when checkbox is checked */}
            {shouldSaveRecipient && (
              <div className="mt-4 pl-9 animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="text-14 font-medium text-gray-300 mb-2 block">
                  Biệt danh người nhận
                  <span className="text-gray-500 font-normal ml-1">(để bạn dễ nhớ)</span>
                </label>
                <input
                  type="text"
                  value={recipientNickname}
                  onChange={(e) => setRecipientNickname(e.target.value)}
                  placeholder={recipientInfo?.fullName || "vd: Mẹ, Quán cà phê, Bạn cùng phòng..."}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                {!recipientNickname.trim() && (
                  <p className="text-red-400 text-12 mt-2">⚠️ Biệt danh không được để trống</p>
                )}
                <p className="text-12 text-gray-500 mt-2">
                  💡 Tên này chỉ hiển thị với bạn - không cần trùng với tên thật của họ
                </p>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
            SUBMIT BUTTON
        ═══════════════════════════════════════════════════════════════════ */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-14 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 size={20} className="animate-spin" />
                Đang xử lý...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <ArrowRight size={20} />
                Chuyển tiền
              </span>
            )}
          </Button>


        </form>
      </Form>
    </>
  );
};

export default PaymentTransferForm;
