"use client";

import SuiLogo from "@/components/svg/sui.logo";
import ActionModal from "./action-modal";
import { usePurchaseSubscription, useSubscriptionAccess } from "@/hooks/useSubscription";
import { useEffect } from "react";

interface SubscriptionPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const SUBSCRIPTION_PRICE = 0.01; // 0.01 SUI
const SUBSCRIPTION_DURATION = "5 minutes"; // For testing

const SubscriptionPurchaseModal = ({
  isOpen,
  onClose,
  onSuccess,
}: SubscriptionPurchaseModalProps) => {
  const { mutate: purchaseSubscription, isPending, isSuccess, isError } = usePurchaseSubscription();
  const { refetch: refetchSubscription } = useSubscriptionAccess();

  useEffect(() => {
    if (isSuccess) {
      // Wait a bit then refetch subscription status
      setTimeout(async () => {
        console.log('Refetching subscription status after purchase...');
        await refetchSubscription();
        console.log('Subscription status refetched');
      }, 3000);
      
      if (onSuccess) {
      onSuccess();
      }
      onClose();
    }
  }, [isSuccess, onSuccess, onClose, refetchSubscription]);

  const handlePurchase = () => {
    purchaseSubscription(undefined, {
      onSuccess: async () => {
        // Additional refetch after purchase completes
        setTimeout(async () => {
          await refetchSubscription();
        }, 2000);
        
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      },
      onError: (error) => {
        console.error("Subscription purchase failed:", error);
      },
    });
  };

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      primaryButton={{
        label: "PURCHASE SUBSCRIPTION",
        onClick: handlePurchase,
        isLoading: isPending,
      }}
      secondaryButton={{
        label: "CANCEL",
        onClick: onClose,
      }}
    >
      <div className="text-center space-y-[1rem]">
        <h2 className="text-xl font-bold font-offbit uppercase">Subscribe to Trading Sentiment</h2>
        <div className="flex items-center justify-center gap-[0.5rem]">
          <SuiLogo className="size-[2rem] rounded-full" />
          <span className="block font-offbit font-[700] text-[1.6875rem]">
            {SUBSCRIPTION_PRICE}
          </span>
        </div>
        <div className="space-y-2">
          <p className="text-gray-300 font-[700] leading-[1.0625rem] tracking-[0.04em] font-offbit">
            ACCESS TO REAL-TIME <br /> TRADING SENTIMENT DATA
          </p>
          <p className="text-gray-400 text-sm font-offbit">
            Duration: {SUBSCRIPTION_DURATION}
          </p>
        </div>
        {isError && (
          <p className="text-red-400 text-sm font-offbit">
            Purchase failed. Please try again.
          </p>
        )}
      </div>
    </ActionModal>
  );
};

export default SubscriptionPurchaseModal;

