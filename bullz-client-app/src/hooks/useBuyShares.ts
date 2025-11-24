import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Transaction } from "@mysten/sui/transactions";
import { useSignAndExecuteTransaction, useSuiClient, useCurrentAccount } from "@mysten/dapp-kit";
import { useNetworkVariable } from "@/networkConfig";

export interface BuySharesParams {
  vaultId: string;
  usdcAmount: string; 
  minBassetOut: string; 
}

export interface BuySharesResult {
  transactionDigest: string;
  bassetReceived: string;
  feePaid: string;
}

interface ParsedAmounts {
  usdcAmountInMist: number;
  minBassetOutInMist: bigint;
}

interface SwapEventData {
  bassetReceived: string;
  feePaid: string;
}

// USDC/SUI Conversion Constants
// Note: We intentionally use SUI as USDC in the frontend
// Conversion rate: 10 USDC = 0.01 SUI
// This means: 1 USDC = 1,000,000 MIST (10^6)
// And: 1 SUI = 1,000 USDC
const USDC_TO_MIST = Math.pow(10, 6); // 1 USDC = 1,000,000 MIST
// const SUI_TO_USDC = 1000; // 1 SUI = 1,000 USDC

const validateAndParseAmounts = ({
  usdcAmount,
  minBassetOut
}: { usdcAmount: string; minBassetOut: string }): ParsedAmounts => {
  // Convert USDC to MIST: 1 USDC = 1,000,000 MIST
  // Example: 10 USDC = 10,000,000 MIST = 0.01 SUI
  const usdcAmountInMist = Math.floor(parseFloat(usdcAmount) * USDC_TO_MIST);
  const minBassetOutInMist = BigInt(minBassetOut);

  if (usdcAmountInMist <= 0) {
    throw new Error("USDC amount must be greater than 0");
  }

  return { usdcAmountInMist, minBassetOutInMist };
};

const buildBuyTransaction = ({
  packageId,
  userRegistryId,
  vaultId,
  amounts
}: {
  packageId: string;
  userRegistryId: string;
  vaultId: string;
  amounts: ParsedAmounts;
}): Transaction => {
  const tx = new Transaction();
  const [suiCoin] = tx.splitCoins(tx.gas, [amounts.usdcAmountInMist]);

  tx.moveCall({
    package: packageId,
    module: "trading",
    function: "buy_basset_with_usdc",
    arguments: [
      tx.object(vaultId),
      tx.object(userRegistryId),
      suiCoin,
      tx.pure.u64(amounts.minBassetOutInMist),
      tx.object("0x6"),
    ],
  });
  return tx;
};

const isBuySwapEvent = (event: any): boolean => {
  return event.type.includes("SwapExecuted") && event.parsedJson?.is_buy === true;
};

const extractBuySwapData = (parsedJson: any): SwapEventData => {
  return {
    bassetReceived: parsedJson.amount_out?.toString() || "0",
    feePaid: parsedJson.fee_paid?.toString() || "0",
  };
};

const parseSwapEvents = (events: any[]): SwapEventData => {
  const defaultData: SwapEventData = { bassetReceived: "0", feePaid: "0" };
  const swapEvent = events.find(isBuySwapEvent);

  if (!swapEvent?.parsedJson) {
    return defaultData;
  }

  return extractBuySwapData(swapEvent.parsedJson);
};

const handleTransactionSuccess = async ({
  digest,
  suiClient,
  queryClient,
  vaultId
}: {
  digest: string;
  suiClient: any;
  queryClient: any;
  vaultId: string;
}): Promise<BuySharesResult> => {
  console.log("Transaction submitted successfully:", digest);
  
  const result = await suiClient.waitForTransaction({
    digest,
    options: {
      showEffects: true,
      showEvents: true,
    },
  });

  console.log("Transaction confirmed:", result);

  if (result.effects?.status?.status !== "success") {
    throw new Error("Transaction failed");
  }

  const { bassetReceived, feePaid } = parseSwapEvents(result.events || []);

  console.log("Transaction details:", {
    bassetReceived,
    feePaid,
    events: (result.events || []).length
  });

  queryClient.invalidateQueries({ queryKey: ["vault-info", vaultId] });
  queryClient.invalidateQueries({ queryKey: ["user-vault-balance", vaultId] });
  queryClient.invalidateQueries({ queryKey: ["vault-price", vaultId] });

  return {
    transactionDigest: digest,
    bassetReceived,
    feePaid,
  };
};

const validateBuyParams = ({
  currentAccount,
  packageId,
  userRegistryId
}: {
  currentAccount: any;
  packageId: string | null;
  userRegistryId: string | null;
}): void => {
  if (!currentAccount?.address) {
    throw new Error("Wallet not connected");
  }
  if (!packageId) {
    throw new Error("Package ID not configured");
  }
  if (!userRegistryId) {
    throw new Error("User Registry ID not configured");
  }
};

const executeBuyTransaction = ({
  tx,
  signAndExecute,
  suiClient,
  queryClient,
  vaultId
}: {
  tx: Transaction;
  signAndExecute: any;
  suiClient: any;
  queryClient: any;
  vaultId: string;
}): Promise<BuySharesResult> => {
  return new Promise((resolve, reject) => {
    signAndExecute(
      { transaction: tx },
      {
        onSuccess: async ({ digest }: { digest: string }) => {
          try {
            const result = await handleTransactionSuccess({
              digest,
              suiClient,
              queryClient,
              vaultId
            });
            resolve(result);
          } catch (error) {
            console.error("Error processing buy transaction:", error);
            reject(error);
          }
        },
        onError: (error: any) => {
          console.error("Error executing buy transaction:", error);
          reject(error);
        },
      }
    );
  });
};

export const useBuyShares = () => {
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const packageId = useNetworkVariable("packageId");
  const userRegistryId = useNetworkVariable("userRegistryId");
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["buy-shares"],
    mutationFn: async ({ vaultId, usdcAmount, minBassetOut }: BuySharesParams): Promise<BuySharesResult> => {
      validateBuyParams({ currentAccount, packageId, userRegistryId });

      const amounts = validateAndParseAmounts({ usdcAmount, minBassetOut });
      const tx = buildBuyTransaction({
        packageId: packageId!,
        userRegistryId: userRegistryId!,
        vaultId,
        amounts
      });

      console.log("Buy shares parameters:", {
        vaultId,
        usdcAmount,
        usdcAmountInMist: amounts.usdcAmountInMist,
        minBassetOut,
        minBassetOutInMist: amounts.minBassetOutInMist.toString(),
        packageId,
        userRegistryId
      });

      return executeBuyTransaction({
        tx,
        signAndExecute,
        suiClient,
        queryClient,
        vaultId
      });
    },
  });
};
