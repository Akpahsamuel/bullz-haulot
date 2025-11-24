"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import SubscriptionPurchaseModal from "./modals/subscription-purchase-modal";

interface UpgradeToViewProps {
  title?: string;
  description?: string;
  className?: string;
}

const UpgradeToView = ({
  title = "Subscribe to View Trading Sentiment",
  description = "Get access to real-time trading sentiment data and see what people are buying",
  className = "",
}: UpgradeToViewProps) => {
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  return (
    <>
      <div className={`flex flex-col items-center justify-center p-8 text-center space-y-4 ${className}`}>
        <div className="space-y-2">
          <h3 className="font-offbit font-bold text-body-lg uppercase text-white">
            {title}
          </h3>
          <p className="font-offbit text-body-md text-gray-400">
            {description}
          </p>
        </div>
        <Button
          onClick={() => setShowPurchaseModal(true)}
          className="mt-4"
        >
          Subscribe for 0.01 SUI
        </Button>
      </div>
      <SubscriptionPurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
      />
    </>
  );
};

export default UpgradeToView;

