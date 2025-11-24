import BottomSheet from "@/components/general/bottom-sheet";
import CheckMarkIcon from "@/components/icons/check-mark.icon";
import CopyIcon from "@/components/icons/copy.icon";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store/app-store";
import { useState } from "react";
import QRCode from "react-qr-code";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { useCurrentAccount } from "@mysten/dapp-kit";
import useAuth from "@/lib/hooks/use-auth";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}

const DepositForm = (props: Props) => {
  const { address } = useAppStore();
  const { user } = useAuth();
  const currentAccount = useCurrentAccount();
  
  // Get address from multiple sources (wallet connection, app store, or auth user)
  const walletAddress = currentAccount?.address || address || user?.wallet_address || "";
  const [textToCopy] = useState<string>(walletAddress);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Reset "copied" state after 2 seconds
  };
  return (
    <BottomSheet isOpen={props.isOpen} onClose={props.onClose}>
      <div>
        <div className="space-y-[1rem] flex flex-col items-center">
          <p className="font-offbit text-white text-[1.375rem] font-[700] leading-[100%] tracking-[0.04em]">
            DEPOSIT SUI
          </p>
          <p className="font-offbit uppercase text-gray-300 text-[1.0625rem] text-center font-[700] leading-[100%] tracking-[0.04em]">
            scan the code or copy your address to add sui
          </p>
        </div>
        <div className="size-[16rem] mx-auto rounded-[1rem] p-[0.75rem] bg-white my-[1rem]">
          <QRCode
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            value={walletAddress}
            viewBox={`0 0 256 256`}
          />
        </div>
        <div className="items-center flex mb-[1rem]">
          <span className="bg-gray-850 p-[0.75rem] text-[1.0625rem] font-[700] leading-[100%] tracking-[0.04em] text-gray-300 w-[20.375rem] truncate">
            {walletAddress}
          </span>
          <CopyToClipboard text={textToCopy} onCopy={handleCopy}>
            <Button className="w-max" variant={"secondary"}>
              {copied ? (
                <CheckMarkIcon className="size-[1.5rem] text-green-400" />
              ) : (
                <CopyIcon color="white" />
              )}
            </Button>
          </CopyToClipboard>
        </div>
        <Button onClick={props.onClose} className="w-full">
          CLOSE
        </Button>
      </div>
    </BottomSheet>
  );
};

export default DepositForm;
