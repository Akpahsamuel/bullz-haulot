import { useAppStore } from "@/lib/store/app-store";
import {
  useCurrentAccount,
  useSuiClient,
} from "@mysten/dapp-kit";
import { useState, useRef, useEffect } from "react";
import { Link  } from "react-router";
import { MIST_PER_SUI } from "@mysten/sui/utils";
// import DefaultDp from "../svg/default-dp";
// import BullTrophy from "../svg/bull-trophy";
// import SuiLogo from "../svg/sui.logo";
import USDCIcon from "../icons/usdc.icon";
import AlphaIcon from "../icons/alpha.icon";
import ShillIcon from "../icons/shill.icon";
// import SubscriptionStatus from "../general/subscription-status";

const Header = () => {
  const { address } = useAppStore();
  const currentAccount = useCurrentAccount();
  // const { mutate: disconnect } = useDisconnectWallet();
  const suiClient = useSuiClient();
  // const navigate = useNavigate();
  const [__, setShowDropdown] = useState(false);
  const [balance, setBalance] = useState<string>("0.00");
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
 
  const [_, setCurrentNetwork] = useState<string>("testnet");
  const dropdownRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (suiClient) {
     
      const url = (suiClient as any).transport?.url || "";
      if (url.includes("testnet")) {
        setCurrentNetwork("testnet");
      } else if (url.includes("mainnet")) {
        setCurrentNetwork("mainnet");
      } else {
       
        setCurrentNetwork("testnet");
      }
    }
  }, [suiClient]);

 
  useEffect(() => {
    const fetchBalance = async () => {
      const walletAddress = currentAccount?.address || address;
      if (!walletAddress || !suiClient) return;

      setIsLoadingBalance(true);
      try {
        const balanceResult = await suiClient.getBalance({
          owner: walletAddress,
        });

     
        const suiBalance =
          Number(balanceResult.totalBalance) / Number(MIST_PER_SUI);
        setBalance(suiBalance.toFixed(2));
      } catch (error) {
        setBalance("0.00");
      } finally {
        setIsLoadingBalance(false);
      }
    };

    fetchBalance();

   
    const intervalId = setInterval(fetchBalance, 10000);

    return () => clearInterval(intervalId);
  }, [currentAccount?.address, address, suiClient]);

  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // const handleDisconnect = () => {
  //   setShowDropdown(false);

  //   disconnect(undefined, {
  //       onSuccess: () => {
  //         setAddress(""); 
  //       setBalance("0.00"); 
  //       navigate("/login"); 
  //     },
  //     onError: () => {
       
  //       setAddress("");
  //       setBalance("0.00");
  //       navigate("/login");
  //     },
  //   });
  // };

  // const formatAddress = (addr: string) => {
  //   if (!addr || addr.length <= 8) return addr;
  //   return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  // };

  // const getNetworkColor = (network: string) => {
  //   switch (network) {
  //     case "mainnet":
  //       return "text-green-400";
  //     case "testnet":
  //       return "text-yellow-400";
  //     case "devnet":
  //       return "text-blue-400";
  //     default:
  //       return "text-gray-400";
  //   }
  // };

  // Only show the user profile if wallet is connected
  const displayAddress = currentAccount?.address || address;
  if (!displayAddress) {
    return null; // Don't render header if no wallet is connected
  }

  return (
    <div className="flex fixed px-[1.5rem] py-[0.5rem] max-w-[26.875rem]  mx-auto w-full z-50 top-0 items-center bg-background justify-between  mb-[1.62875rem]">
      <div className="flex items-center gap-2">
        <Link to={"/profile"}>
          <div className="size-7 rounded-full overflow-hidden">
            <img src="/images/profile.jpg" alt="profile image" />
          </div>
        </Link>
        {/* <SubscriptionStatus className="text-xs" showPurchaseButton={false} /> */}
      </div>
      {/* <div className="relative" ref={dropdownRef}>
        <button
          className="gap-[0.5rem] flex items-center cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <DefaultDp className="size-[1.375rem] rounded-full" />
          <div className="flex flex-col items-start">
            <span className="font-[600] leading-[100%] text-sm w-[7.5625rem] truncate">
              {formatAddress(displayAddress)}
            </span>
            <span
              className={`text-[0.5rem] font-[500] ${getNetworkColor(currentNetwork)} leading-[100%] uppercase`}
            >
              {currentNetwork}
            </span>
          </div>
        </button>

        {showDropdown && (
          <div className="absolute top-full left-0 mt-2 bg-gray-800 border border-gray-600 rounded-md shadow-lg min-w-[150px] z-60">
            <div className="p-2">
              <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-600">
                Network:{" "}
                <span className={getNetworkColor(currentNetwork)}>
                  {currentNetwork.toUpperCase()}
                </span>
              </div>
              <button
                onClick={handleDisconnect}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 rounded-md transition-colors font-[600]"
              >
                Disconnect Wallet
              </button>
            </div>
          </div>
        )}
      </div> */}
      <div className=" text-white flex items-center gap-0.5">
        <div
          style={{
            boxShadow:
              "0px -4px 0px 0px #0000003D inset, 0px 4px 0px 0px #FFFFFF29 inset",
          }}
          className="bg-gray-800 flex items-center justify-center gap-1 p-[6px] h-8"
        >
          <img src="/images/chat-gpt-image.png" alt="chat gpt image" width={20} height={20} />
        </div>

        <div
          style={{
            boxShadow:
              "0px -4px 0px 0px #0000003D inset, 0px 4px 0px 0px #FFFFFF29 inset",
          }}
          className="bg-gray-800 grid grid-cols-2 items-center gap-1 px-2 py-[6px] h-8"
        >
          {/* <SuiLogo className="w-[1.25rem] h-[1.25rem] rounded-full" /> */}
          <div className="flex items-center gap-0.5 justify-center">
            <AlphaIcon />
            <span className="h-3 leading-[100%] tracking-[0.04em] font-[700] text-[1.0625rem]">
              5K
            </span>
          </div>
          <div className="flex items-center justify-center gap-0.5">
            <ShillIcon />
            <span className="h-3 leading-[100%] tracking-[0.04em] font-[700] text-[1.0625rem]">
              1K
            </span>
          </div>
        </div>

        <div
          style={{
            boxShadow:
              "0px -4px 0px 0px #0000003D inset, 0px 4px 0px 0px #FFFFFF29 inset",
          }}
          className="bg-gray-800 flex items-center gap-1 px-3 py-[6px] h-8"
        >
          <USDCIcon />
          <span className="h-3 leading-[100%] tracking-[0.04em] font-[700] text-[1.0625rem]">
            {isLoadingBalance ? balance : balance}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Header;
