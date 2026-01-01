// Đây là PHIÊN BẢN MỚI của submit function trong PaymentTransferForm.tsx
// COPY code này và THAY THẾ submit function cũ (dòng 52-95)

const submit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);

    try {
        const receiverAccountId = decryptId(data.sharableId);
        const receiverBank = await getBankByAccountId({
            accountId: receiverAccountId,
        });
        const senderBank = await getBank({ documentId: data.senderBank });

        if (!receiverBank || !senderBank) {
            alert("Invalid bank account");
            setIsLoading(false);
            return;
        }

        // ✅ E-WALLET TRANSFER - Update balance TỨC THÌ (giống Momo/ZaloPay)
        const result = await transferBalance({
            senderId: senderBank.userId,
            receiverId: receiverBank.userId,
            amount: parseFloat(data.amount),
            description: data.name,
            email: data.email,
        });

        if (result && result.success) {
            alert(`✅ Transfer successful! Your new balance: $${result.newBalance.toFixed(2)}`);
            form.reset();
            router.push("/");
        }
    } catch (error: any) {
        // ✅ Hiển thị lỗi rõ ràng cho user (VD: Insufficient balance)
        console.error("Transfer failed:", error);
        alert(`❌ Transfer failed: ${error.message || "Unknown error"}`);
    }

    setIsLoading(false);
};
