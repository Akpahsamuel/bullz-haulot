"use client";

import { useSubscriptionAccess } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import SubscriptionPurchaseModal from "./modals/subscription-purchase-modal";

interface SubscriptionStatusProps {
  className?: string;
  showPurchaseButton?: boolean;
}

const SubscriptionStatus = ({ className, showPurchaseButton = true }: SubscriptionStatusProps) => {
  const { hasAccess, isActive, isExpired, timeRemaining, isLoading } = useSubscriptionAccess();
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  const formatTimeRemaining = (ms: number): string => {
    if (ms <= 0) return "Expired";
    
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  if (isLoading) {
    return (
      <div className={className}>
        <p className="text-gray-400 text-sm font-offbit">Loading subscription...</p>
      </div>
    );
  }

  if (hasAccess && isActive) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-green-400 text-sm font-offbit uppercase">
            Active - {formatTimeRemaining(timeRemaining)} remaining
          </span>
        </div>
      </div>
    );
  }

  if (isExpired && hasAccess) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
          <span className="text-yellow-400 text-sm font-offbit uppercase">
            Expired
          </span>
          {showPurchaseButton && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowPurchaseModal(true)}
              className="ml-2"
            >
              Renew
            </Button>
          )}
        </div>
        <SubscriptionPurchaseModal
          isOpen={showPurchaseModal}
          onClose={() => setShowPurchaseModal(false)}
        />
      </div>
    );
  }

  return null;
};

export default SubscriptionStatus;

