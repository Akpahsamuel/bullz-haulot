import SwitchIcon from "@/components/icons/switch.icon"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import React from "react"
import { useVaultInfo } from "@/hooks/useVaults"
import { useVaultPrice } from "@/hooks/useVaults"
import { useUserVaultBalance } from "@/hooks/useVaults"
import { useVaults } from "@/hooks/useVaults"
import { useQuoteBuy } from "@/hooks/useVaultFees"
import USDCIcon from "@/components/icons/usdc.icon"
import { useBuyShares } from "@/hooks/useBuyShares"
import { useSellShares } from "@/hooks/useSellShares"
import { useSuiBalance } from "@/hooks/useSuiBalance"
import { useQuoteSell } from "@/hooks/useVaultFees"

// Generic format function for amounts
function formatAmount(amount: string | number, type: 'usdc' | 'asset'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (type === 'asset' && num >= 1000000000000) {
    return (num / 1000000000000).toFixed(2) + 'T';
  }
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(type === 'usdc' ? 1 : 2) + 'B';
  } else if (num >= 1000000) {
    return (num / 1000000).toFixed(type === 'usdc' ? 1 : 2) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(type === 'usdc' ? 1 : 2) + 'k';
  } else if (num >= 1) {
    return num.toFixed(type === 'usdc' ? 2 : 0);
  } else if (num >= 0.01) {
    return num.toFixed(4);
  } else {
    return num.toFixed(type === 'usdc' ? 2 : 6);
  }
}

// Format USDC amounts for display
function formatUsdcAmount(amount: string | number): string {
  return formatAmount(amount, 'usdc');
}

// USDC/SUI Conversion Constants
// Note: We intentionally use SUI as USDC in the frontend
// Conversion rate: 10 USDC = 0.01 SUI
// This means: 1 USDC = 1,000,000 MIST (10^6)
// And: 1 SUI = 1,000 USDC
const SUI_TO_MIST = 1_000_000_000; // 1 SUI = 1,000,000,000 MIST
const SUI_TO_USDC_RATIO = 1000; // 1 SUI = 1,000 USDC

// Format asset amounts for display (shares)
function formatAssetAmount(amount: string | number): string {
  return formatAmount(amount, 'asset');
}

type Action = 'buy' | 'sell'

interface ShareActionProps {
    vaultId?: string
}

const ShareAction = ({ vaultId }: ShareActionProps) => {
    const [action, setAction] = React.useState<'buy' | 'sell'>('buy')
    const { data: vaultInfo } = useVaultInfo(vaultId || '')
    const { data: priceData } = useVaultPrice(vaultId || '')
    const { data: userBalance } = useUserVaultBalance(vaultId || '')


    const renderAction = (action: Action): React.ReactNode => {
        switch (action) {
            case 'buy':
                return <BuyAction vaultInfo={vaultInfo} priceData={priceData} />
            case 'sell':
                return <SellAction vaultInfo={vaultInfo} priceData={priceData} userBalance={userBalance} />
            default:
                return <></>
        }
    }
    return (
        <>
            <div className="grid gap-6">
                <section id="action" className="flex items-center bg-gray-800 w-full h-11 p-1 font-bold font-offbit text-[17px] leading-[100%] tracking-[0.04em] text-gray-300">
                    <button className={cn("flex-1 h-full  uppercase", action === 'buy' && "bg-[#00FF00] text-black")} onClick={() => setAction("buy")}>Buy</button>
                    <button className={cn("flex-1 h-full uppercase", action === 'sell' && "bg-[#FF0000] text-white")} onClick={() => setAction('sell')}>Sell</button>
                </section>
                <section className="grid gap-6">
                    {renderAction(action)}
                </section>
            </div>
        </>
    )
}

export default ShareAction

// Helper component for token images
const TokenImage = ({ symbol, size = "size-6" }: { symbol: string, size?: string }) => {
    // Special handling for USDC
    if (symbol === 'USDC') {
        return (
            <div className={`${size} overflow-hidden bg-gray-400 flex items-center justify-center`}>
                <USDCIcon className="w-full h-full" />
            </div>
        )
    }

    // Fetch vault data dynamically from blockchain
    const { data: vaults } = useVaults()
    const vault = vaults?.find(v => v.symbol === symbol)
    const imageUrl = vault?.imageUrl
    const name = vault?.name || symbol

    return (
        <div className={`${size} overflow-hidden bg-gray-400`}>
            {imageUrl ? (
                <img
                    src={imageUrl}
                    alt={name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                />
            ) : null}
            <div className={`w-full h-full bg-gray-400 flex items-center justify-center ${imageUrl ? 'hidden' : ''}`}>
                <span className="text-xs font-bold">{symbol.charAt(0)}</span>
            </div>
        </div>
    )
}

const BuyAction = ({ vaultInfo, priceData }: { vaultInfo?: any, priceData?: string }) => {
    const [usdcAmount, setUsdcAmount] = React.useState("")
    const [slippage, setSlippage] = React.useState(0.5) // 0.5% default slippage
    
    // Price conversion: calculateVaultPrice returns (usdc_reserve * 1_000_000_000) / trading_supply
    // To get price per smallest unit in USDC: price / 1_000_000_000
    const price = priceData ? parseFloat(priceData) / 1_000_000_000 : 0 // Convert to USDC per bBNB (smallest unit)
    const { data: suiBalance } = useSuiBalance()
    const { data: userBalance } = useUserVaultBalance(vaultInfo?.vaultId || '')



    const { data: quoteData } = useQuoteBuy(vaultInfo?.vaultId || '', usdcAmount)


    const expectedBassetOut = quoteData || "0"
    const minBassetOut = React.useMemo(() => {
        if (!expectedBassetOut || expectedBassetOut === "0") return "0"
        const slippageAmount = BigInt(expectedBassetOut) * BigInt(Math.floor(slippage * 100)) / BigInt(10000)
        return (BigInt(expectedBassetOut) - slippageAmount).toString()
    }, [expectedBassetOut, slippage])


    const feeAmount = React.useMemo(() => {
        if (!usdcAmount || usdcAmount === "0") return "0"
        const amount = parseFloat(usdcAmount)
        return (amount * 0.003).toFixed(6)
    }, [usdcAmount])


    const maxSpendWithSlippage = React.useMemo(() => {
        if (!usdcAmount || usdcAmount === "0") return "0"
        const amount = parseFloat(usdcAmount)
        return (amount * (1 + slippage / 100)).toFixed(6)
    }, [usdcAmount, slippage])


    const buySharesMutation = useBuyShares()

    const handleBuy = async () => {
        console.log("Buy button clicked!");
        console.log("Current state:", {
            vaultId: vaultInfo?.vaultId,
            usdcAmount,
            minBassetOut,
            isBuyDisabled,
            buySharesMutation: {
                isPending: buySharesMutation.isPending,
                isError: buySharesMutation.isError,
                isSuccess: buySharesMutation.isSuccess
            }
        });

        if (!vaultInfo?.vaultId || !usdcAmount || parseFloat(usdcAmount) <= 0) {
            console.log("Buy validation failed:", {
                hasVaultId: !!vaultInfo?.vaultId,
                hasUsdcAmount: !!usdcAmount,
                usdcAmountValid: parseFloat(usdcAmount) > 0
            });
            return
        }

        console.log("Starting buy transaction...");

        try {
            const result = await buySharesMutation.mutateAsync({
                vaultId: vaultInfo.vaultId,
                usdcAmount,
                minBassetOut,
            });

            console.log("Buy transaction successful:", result);

            // Reset form on success
            setUsdcAmount("")
        } catch (error) {
            console.error("Buy transaction failed:", error);
        }
    }

    const handleMaxAmount = () => {
        if (suiBalance) {
            // Convert SUI to USDC: (SUI in MIST / SUI_TO_MIST) * SUI_TO_USDC_RATIO
            // Example: 0.01 SUI (10,000,000 MIST) = 10 USDC
            // Formula: (10,000,000 / 1,000,000,000) * 1000 = 10 USDC
            const maxUsdc = ((parseFloat(suiBalance) / SUI_TO_MIST) * SUI_TO_USDC_RATIO).toFixed(2)
            setUsdcAmount(maxUsdc)
        }
    }

    const isBuyDisabled = !usdcAmount || parseFloat(usdcAmount) <= 0 || buySharesMutation.isPending

    return (
        <>
            <div className="">
                <div className="grid gap-2 p-4 bg-gray-800">
                    <div className="flex items-center justify-between">
                        <p className="text-gray-400 font-bold font-offbit text-[14px] leading-[100%] tracking-[4%] uppercase">you pay</p>
                        <button
                            className="text-white underline font-bold font-offbit text-[14px] leading-[100%] tracking-[4%] uppercase"
                            onClick={handleMaxAmount}
                        >
                            max
                        </button>
                    </div>
                    <div className="flex items-center justify-between">
                        <input
                            type="number"
                            className="font-offbit font-bold text-[34px] text-gray-100 w-2xs outline-0 bg-transparent"
                            value={usdcAmount}
                            onChange={(e) => setUsdcAmount(e.target.value)}
                            placeholder="0"
                            step="0.01"
                            min="0"
                        />
                        <div className="flex items-center gap-1">
                            <TokenImage symbol="USDC" />
                            <span className="text-gray-400 font-bold font-offbit text-[14px] leading-[100%] tracking-[4%] uppercase">usdc</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <p className="text-gray-400 font-bold font-offbit text-[14px] leading-[100%] tracking-[4%] uppercase">balance</p>
                        <p className="text-gray-400 font-bold font-offbit text-[14px] leading-[100%] tracking-[4%] uppercase">
                            {suiBalance ? `${formatUsdcAmount((parseFloat(suiBalance) / SUI_TO_MIST) * SUI_TO_USDC_RATIO)} USDC` : "0 USDC"}
                        </p>
                    </div>
                </div>
                <div className="bg-gray-100 w-full h-1 relative">
                    <button className="absolute w-8 h-6 bg-gray-100 grid place-content-center inset-0 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" onClick={() => { }}><SwitchIcon /></button>
                </div>
                <div className="grid gap-2 p-4 bg-gray-800">
                    <div className="flex items-center justify-between">
                        <p className="text-gray-400 font-bold font-offbit text-[14px] leading-[100%] tracking-[4%] uppercase">you recieve</p>
                    </div>
                    <div className="flex items-center justify-between">
                        <input 
                            className="font-offbit font-bold text-[34px] text-gray-300 w-2xs bg-transparent" 
                            value={expectedBassetOut ? formatAssetAmount(expectedBassetOut) : '0'} 
                            disabled 
                        />
                        <div className="flex items-center gap-1">
                            <TokenImage symbol={vaultInfo?.symbol || 'bETH'} />
                            <p className="text-gray-400 font-bold font-offbit text-[14px] leading-[100%] tracking-[4%]">{vaultInfo?.symbol || 'bETH'}</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <p className="text-gray-400 font-bold font-offbit text-[14px] leading-[100%] tracking-[4%] uppercase">balance</p>
                        <p className="text-gray-400 font-bold font-offbit text-[14px] leading-[100%] tracking-[4%]">
                            {userBalance ? `${formatAssetAmount(userBalance)} ${vaultInfo?.symbol || 'bETH'}` : `0 ${vaultInfo?.symbol || 'bETH'}`}
                        </p>
                    </div>
                </div>
            </div>
            <Button
                className="w-full"
                onClick={handleBuy}
                disabled={isBuyDisabled}
            >
                {buySharesMutation.isPending ? "Buying..." : "Buy now"}
            </Button>
            {buySharesMutation.isError && (
                <div className="text-red-400 text-sm text-center p-2">
                    {buySharesMutation.error?.message || "Transaction failed"}
                </div>
            )}
            {buySharesMutation.isSuccess && (
                <div className="text-green-400 text-sm text-center p-2 bg-[#003300]">
                    <p className="font-offbit font-bold uppercase">
                        Successfully bought shares
                    </p>
                </div>
                // ! Transaction: {buySharesMutation.data?.transactionDigest.slice(0, 8)}...
            )}
            <div className="grid gap-2">
                <div className="flex items-center justify-between">
                    <p className="text-gray-400 font-bold font-offbit text-[14px] leading-[100%] tracking-[4%] uppercase">Rate</p>
                    <div className="max-w-[173px] w-full border border-dotted border-gray-600" />
                    <p className="text-gray-400 font-bold font-offbit text-[14px] leading-[100%] tracking-[4%]">1 {vaultInfo?.symbol || 'bETH'} = ${price > 0 && price < 0.0001 ? price.toFixed(12) : price.toFixed(6)} USDC</p>
                </div>
                <div className="flex items-center justify-between">
                    <p className="text-gray-400 font-bold font-offbit text-[14px] leading-[100%] tracking-[4%] uppercase">Your Spend</p>
                    <div className="max-w-[173px] w-full border border-dotted border-gray-600" />
                    <p className="text-gray-400 font-bold font-offbit text-[14px] leading-[100%] tracking-[4%]">{formatUsdcAmount(usdcAmount || "0")} USDC</p>
                </div>
                <div className="flex items-center justify-between">
                    <p className="text-gray-400 font-bold font-offbit text-[14px] leading-[100%] tracking-[4%] uppercase">Max spend with slippage</p>
                    <div className="max-w-[104px] w-full border border-dotted border-gray-600" />
                    <p className="text-gray-400 font-bold font-offbit text-[14px] leading-[100%] tracking-[4%]">{formatUsdcAmount(maxSpendWithSlippage)} USDC</p>
                </div>
                <div className="flex items-center justify-between">
                    <p className="text-gray-400 font-bold font-offbit text-[14px] leading-[100%] tracking-[4%] uppercase">Fees</p>
                    <div className="max-w-[173px] w-full border border-dotted border-gray-600" />
                    <p className="text-gray-400 font-bold font-offbit text-[14px] leading-[100%] tracking-[4%]">{formatUsdcAmount(feeAmount)} USDC</p>
                </div>
                <div className="flex items-center justify-between">
                    <p className="text-gray-400 font-bold font-offbit text-[14px] leading-[100%] tracking-[4%] uppercase">Slippage</p>
                    <div className="max-w-[173px] w-full border border-dotted border-gray-600" />
                    <div className="flex items-center gap-2">
                        <button
                            className="text-gray-400 hover:text-white text-xs"
                            onClick={() => setSlippage(0.1)}
                        >
                            0.1%
                        </button>
                        <button
                            className="text-gray-400 hover:text-white text-xs"
                            onClick={() => setSlippage(0.5)}
                        >
                            0.5%
                        </button>
                        <button
                            className="text-gray-400 hover:text-white text-xs"
                            onClick={() => setSlippage(1.0)}
                        >
                            1.0%
                        </button>
                        <span className="text-gray-400 font-bold font-offbit text-[14px] leading-[100%] tracking-[4%]">{slippage}%</span>
                    </div>
                </div>
            </div>
        </>
    )
}


const SellAction = ({ vaultInfo, priceData, userBalance }: { vaultInfo?: any, priceData?: string, userBalance?: string }) => {
    const [bassetAmount, setBassetAmount] = React.useState("")
    const [slippage] = React.useState(0.5) // 0.5% default slippage
    
    // Price conversion: calculateVaultPrice returns (usdc_reserve * 1_000_000_000) / trading_supply
    // To get price per smallest unit in USDC: price / 1_000_000_000
    const price = priceData ? parseFloat(priceData) / 1_000_000_000 : 0 // Convert to USDC per bBNB (smallest unit)
    const { data: suiBalance } = useSuiBalance()


    // Get quote for the current basset amount
    const { data: quoteData } = useQuoteSell(vaultInfo?.vaultId || '', bassetAmount)

    // Calculate expected USDC amount and slippage protection
    const expectedUsdcOut = quoteData || "0"
    const minUsdcOut = React.useMemo(() => {
        if (!expectedUsdcOut || expectedUsdcOut === "0") return "0"
        const slippageAmount = BigInt(expectedUsdcOut) * BigInt(Math.floor(slippage * 100)) / BigInt(10000)
        return (BigInt(expectedUsdcOut) - slippageAmount).toString()
    }, [expectedUsdcOut, slippage])

    // Calculate fees (assuming 0.5% fee based on contract)
    const feeAmount = React.useMemo(() => {
        if (!bassetAmount || bassetAmount === "0") return "0"
        const amount = parseFloat(bassetAmount)
        return (amount * 0.005).toFixed(6) // 0.5% fee
    }, [bassetAmount])

    // Sell shares mutation
    const sellSharesMutation = useSellShares()

    const handleSell = async () => {
        if (!vaultInfo?.vaultId || !bassetAmount || parseFloat(bassetAmount) <= 0) {
            return
        }

        try {
            await sellSharesMutation.mutateAsync({
                vaultId: vaultInfo.vaultId,
                bassetAmount,
                minUsdcOut,
            });

            // Reset form on success
            setBassetAmount("")
        } catch (error) {
            console.error("Sell transaction failed:", error);
        }
    }

    const handleMaxAmount = () => {
        if (userBalance) {
            // Shares are whole numbers, no decimal conversion needed
            setBassetAmount(userBalance)
        }
    }

    const isSellDisabled = !bassetAmount || parseFloat(bassetAmount) <= 0 || sellSharesMutation.isPending || !userBalance || parseFloat(userBalance) <= 0


    return (
        <>
            <div className="">
                <div className="grid gap-2 p-4 bg-gray-800">
                    <div className="flex items-center justify-between">
                        <p className="text-gray-400 font-bold font-offbit text-[14px] leading-[100%] tracking-[4%] uppercase">you sell</p>
                        <button
                            className="text-white underline font-bold font-offbit text-[14px] leading-[100%] tracking-[4%] uppercase"
                            onClick={handleMaxAmount}
                        >
                            max
                        </button>
                    </div>
                    <div className="flex items-center justify-between">
                        <input
                            type="number"
                            className="font-offbit font-bold text-[34px] text-gray-100 w-2xs outline-0 bg-transparent"
                            value={bassetAmount}
                            onChange={(e) => setBassetAmount(e.target.value)}
                            placeholder="0"
                            step="0.000001"
                            min="0"
                        />
                        <div className="flex items-center gap-1">
                            <TokenImage symbol={vaultInfo?.symbol || 'bETH'} />
                            <span className="text-gray-400 font-bold font-offbit text-[14px] leading-[100%] tracking-[4%] uppercase">{vaultInfo?.symbol || 'bETH'}</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <p className="text-gray-400 font-bold font-offbit text-[14px] leading-[100%] tracking-[4%] uppercase">balance</p>
                        <p className="text-gray-400 font-bold font-offbit text-[14px] leading-[100%] tracking-[4%] uppercase">
                            {userBalance ? `${formatAssetAmount(userBalance)} ${vaultInfo?.symbol || 'bETH'}` : `0 ${vaultInfo?.symbol || 'bETH'}`}
                        </p>
                    </div>
                </div>
                <div className="bg-gray-100 w-full h-1 relative">
                    <button className="absolute w-8 h-6 bg-gray-100 grid place-content-center inset-0 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" onClick={() => { }}><SwitchIcon /></button>
                </div>
                <div className="grid gap-2 p-4 bg-gray-800">
                    <div className="flex items-center justify-between">
                        <p className="text-gray-400 font-bold font-offbit text-[14px] leading-[100%] tracking-[4%] uppercase">you recieve</p>
                    </div>
                    <div className="flex items-center justify-between">
                        <input
                            className="font-offbit font-bold text-[34px] text-gray-300 w-2xs bg-transparent"
                            value={expectedUsdcOut ? (parseFloat(expectedUsdcOut) / Math.pow(10, 6)).toFixed(6) : '0'}
                            disabled
                        />
                        <div className="flex items-center gap-1">
                            <TokenImage symbol="USDC" />
                            <p className="text-gray-400 font-bold font-offbit text-[14px] leading-[100%] tracking-[4%]">USDC</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <p className="text-gray-400 font-bold font-offbit text-[14px] leading-[100%] tracking-[4%] uppercase">balance</p>
                        <p className="text-gray-400 font-bold font-offbit text-[14px] leading-[100%] tracking-[4%] uppercase">
                            {suiBalance ? `${(parseFloat(suiBalance) / 1_000_000_000).toFixed(2)} SUI` : "0 SUI"}
                        </p>
                    </div>
                </div>
            </div>
            <Button
                className="w-full"
                onClick={handleSell}
                disabled={isSellDisabled}
                style={{
                    opacity: isSellDisabled ? 0.5 : 1,
                    cursor: isSellDisabled ? 'not-allowed' : 'pointer'
                }}
            >
                {sellSharesMutation.isPending ? "Selling..." : "Sell now"}
            </Button>
            {sellSharesMutation.isError && (
                <div className="text-red-400 text-sm text-center p-2">
                    {sellSharesMutation.error?.message || "Transaction failed"}
                </div>
            )}
            {sellSharesMutation.isSuccess && (
                <div className="text-green-400 text-sm text-center p-2">
                    Successfully sold shares! Transaction: {sellSharesMutation.data?.transactionDigest.slice(0, 8)}...
                </div>
            )}
            <div className="grid gap-2">
                <div className="flex items-center justify-between">
                    <p className="text-gray-400 font-bold font-offbit text-[14px] leading-[100%] tracking-[4%] uppercase">Rate</p>
                    <div className="max-w-[173px] w-full border border-dotted border-gray-600" />
                    <p className="text-gray-400 font-bold font-offbit text-[14px] leading-[100%] tracking-[4%]">1 {vaultInfo?.symbol || 'bETH'} = ${price > 0 && price < 0.0001 ? price.toFixed(12) : price.toFixed(6)} USDC</p>
                </div>
                <div className="flex items-center justify-between">
                    <p className="text-gray-400 font-bold font-offbit text-[14px] leading-[100%] tracking-[4%] uppercase">Fees</p>
                    <div className="max-w-[173px] w-full border border-dotted border-gray-600" />
                    <p className="text-gray-400 font-bold font-offbit text-[14px] leading-[100%] tracking-[4%]">{formatUsdcAmount(feeAmount)} USDC</p>
                </div>
                <div className="flex items-center justify-between">
                    <p className="text-gray-400 font-bold font-offbit text-[14px] leading-[100%] tracking-[4%] uppercase">Min USDC</p>
                    <div className="max-w-[173px] w-full border border-dotted border-gray-600" />
                    <p className="text-gray-400 font-bold font-offbit text-[14px] leading-[100%] tracking-[4%]">{minUsdcOut ? formatUsdcAmount(parseFloat(minUsdcOut) / Math.pow(10, 6)) : '0'} USDC</p>
                </div>
            </div>
        </>
    )
}