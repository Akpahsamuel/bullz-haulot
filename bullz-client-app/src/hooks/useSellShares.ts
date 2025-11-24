import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSuiClient, useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useNetworkVariable } from "@/networkConfig";

export interface SellSharesParams {
  vaultId: string;
  bassetAmount: string;
  minUsdcOut: string;
}

export interface SellSharesResult {
  transactionDigest: string;
  bassetSold: string;
  usdcReceived: string;
  feePaid: string;
}

interface ParsedAmounts {
  bassetAmountInMist: number;
  minUsdcOutInMist: bigint;
}

interface SwapEventData {
  usdcReceived: string;
  feePaid: string;
}


interface ValidateParams {
  bassetAmount: string;
  minUsdcOut: string;
}

const validateAndParseAmounts = ({
  bassetAmount,
  minUsdcOut
}: ValidateParams): ParsedAmounts => {
  const bassetAmountInMist = Math.floor(parseFloat(bassetAmount));
  const minUsdcOutInMist = BigInt(minUsdcOut);

  if (bassetAmountInMist <= 0) {
    throw new Error("Basset amount must be greater than 0");
  }

  return { bassetAmountInMist, minUsdcOutInMist };
};


interface BuildTxParams {
  packageId: string;
  vaultId: string;
  amounts: ParsedAmounts;
}

const buildSellTransaction = ({
  packageId,
  vaultId,
  amounts
}: BuildTxParams): Transaction => {
  const tx = new Transaction();
  tx.moveCall({
    package: packageId,
    module: "trading",
    function: "sell_basset_for_usdc",
    arguments: [
      tx.object(vaultId),
      tx.pure.u64(amounts.bassetAmountInMist),
      tx.pure.u64(amounts.minUsdcOutInMist),
      tx.object("0x6"),
    ],
  });
  return tx;
};


const isSellSwapEvent = (event: any): boolean => {
  return event.type.includes("SwapExecuted") && event.parsedJson?.is_buy === false;
};


const extractSwapData = (parsedJson: any): SwapEventData => {
  return {
    usdcReceived: parsedJson.amount_out?.toString() || "0",
    feePaid: parsedJson.fee_paid?.toString() || "0",
  };
};


const parseSwapEvents = (events: any[]): SwapEventData => {
  const defaultData: SwapEventData = { usdcReceived: "0", feePaid: "0" };
  const swapEvent = events.find(isSellSwapEvent);
  
  if (!swapEvent?.parsedJson) {
    return defaultData;
  }

  return extractSwapData(swapEvent.parsedJson);
};


const invalidateSellQueries = (queryClient: any, vaultId: string): void => {
  const queryKeys = [
    ["vault-info", vaultId],
    ["user-vault-balance", vaultId],
    ["vault-price", vaultId],
    ["user-portfolio"],
  ];
  
  queryKeys.forEach((key) => {
    queryClient.invalidateQueries({ queryKey: key });
  });
};

interface TransactionSuccessParams {
  digest: string;
  bassetAmount: string;
  suiClient: any;
  queryClient: any;
  vaultId: string;
}


const handleTransactionSuccess = async (
  params: TransactionSuccessParams
): Promise<SellSharesResult> => {
  const { digest, bassetAmount, suiClient, queryClient, vaultId } = params;
  
  console.log("Sell transaction submitted successfully:", digest);

  const result = await suiClient.waitForTransaction({
    digest,
    options: {
      showEffects: true,
      showEvents: true,
    },
  });

  console.log("Sell transaction confirmed:", result);

  if (result.effects?.status?.status !== "success") {
    throw new Error("Sell transaction failed");
  }

  const { usdcReceived, feePaid } = parseSwapEvents(result.events || []);

  console.log("Sell transaction details:", {
    usdcReceived,
    feePaid,
    events: (result.events || []).length
  });

  invalidateSellQueries(queryClient, vaultId);

  return {
    transactionDigest: digest,
    bassetSold: bassetAmount,
    usdcReceived,
    feePaid,
  };
};

export const useSellShares = () => {
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const packageId = useNetworkVariable("packageId");
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["sell-shares"],
    mutationFn: async ({ vaultId, bassetAmount, minUsdcOut }: SellSharesParams): Promise<SellSharesResult> => {
      if (!currentAccount?.address) {
        throw new Error("Wallet not connected");
      }

      if (!packageId) {
        throw new Error("Package ID not configured");
      }

      const amounts = validateAndParseAmounts({ bassetAmount, minUsdcOut });
      const tx = buildSellTransaction({ packageId, vaultId, amounts });

      console.log("Sell shares parameters:", {
        vaultId,
        bassetAmount,
        bassetAmountInMist: amounts.bassetAmountInMist,
        minUsdcOut,
        minUsdcOutInMist: amounts.minUsdcOutInMist.toString(),
        packageId
      });

      return new Promise((resolve, reject) => {
        signAndExecute(
          { transaction: tx },
          {
            onSuccess: async ({ digest }) => {
              try {
                const result = await handleTransactionSuccess({
                  digest,
                  bassetAmount,
                  suiClient,
                  queryClient,
                  vaultId,
                });
                resolve(result);
              } catch (error) {
                console.error("Error processing sell transaction:", error);
                reject(error);
              }
            },
            onError: (error) => {
              console.error("Sell transaction failed:", error);
              reject(error);
            },
          }
        );
      });
    },
  });
};
