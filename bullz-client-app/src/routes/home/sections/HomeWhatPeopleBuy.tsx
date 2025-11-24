import BottomSheet from "@/components/general/bottom-sheet"
import SentimentComponent from "@/components/general/sentimentComponent"
import DottedLeftArrow from "@/components/icons/dotted-arrow-left"
import DottedRightArrow from "@/components/icons/dotted-arrow-right"
import InfoIcon from "@/components/icons/info.icon"
import SquareCloseIcon from "@/components/icons/square-close.icon"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import React from "react"
import { useTradingSentiment } from "@/hooks/useTradingSentiment"
import { useVaults } from "@/hooks/useVaults"
import { useSubscriptionAccess } from "@/hooks/useSubscription"
import UpgradeToView from "@/components/general/upgrade-to-view"
import SubscriptionStatus from "@/components/general/subscription-status"

type Token = {
    symbol: string
    name: string
    image_url: string
    total_share: number
    traded_share: number
    uniqueBuyers: number
    sharesBought: number
    sharesSold: number
    tradingVolume5M: number
    tradingVolume1H: number
    tradingVolume24H: number
    tradingVolume1W: number
    avgSharesPerUser: number
}

type TimeFrame = '5M' | '1H' | '24H' | '1W' | ''

const HomeWhatPeopleBuy = () => {
    const [show, setShow] = React.useState(false)
    const [open, setOpen] = React.useState(false)
    const [activeToken, setActiveToken] = React.useState<Token | null>(null)
    const [timeFrame, setTimeFrame] = React.useState<TimeFrame>('5M')
    
    // Get real data with error handling
    // Check subscription status directly from registry (Clock-validated via useSubscription)
    const { hasAccess: subscriptionHasAccess, isActive, isLoading: subscriptionLoading } = useSubscriptionAccess()
    const { data: sentimentData, isLoading: sentimentLoading, error: sentimentError } = useTradingSentiment()
    const { data: vaults, isLoading: vaultsLoading, error: vaultsError } = useVaults()
    
    // User has access if subscription is active (checked dynamically from registry using Clock)
    // useSubscription reads subscription directly from dynamic fields and validates with Clock
    // This is the source of truth - checks subscription.active && end_time_ms > clock::timestamp_ms(clock)
    const hasAccess = subscriptionHasAccess && isActive
    
    // If sentimentError exists but is not an access error, we might still want to show data
    // But if it's an access error, hasAccess will be false (sentimentData will be null)
    
    // Log access status for debugging
    React.useEffect(() => {
        if (!subscriptionLoading && !sentimentLoading) {
            console.log('🔍 What People Are Buying - Access Check:', {
                subscriptionHasAccess,
                isActive,
                hasAccess,
                hasSentimentData: sentimentData !== null,
                sentimentDataLength: sentimentData?.assets?.length || 0,
                isLoading: sentimentLoading || subscriptionLoading,
                sentimentError: sentimentError?.message,
                errorType: (sentimentError as any)?.accessResult?.reason || 'none',
            });
        }
    }, [hasAccess, subscriptionHasAccess, isActive, sentimentData, sentimentLoading, subscriptionLoading, sentimentError]);

    // Handle errors gracefully to prevent white screen
    React.useEffect(() => {
        if (sentimentError) {
            console.error('Trading sentiment error:', sentimentError);
        }
        if (vaultsError) {
            console.error('Vaults error:', vaultsError);
        }
    }, [sentimentError, vaultsError]);

    // Transform sentiment data to tokens format
    const tokens: Array<Token> = React.useMemo(() => {
        if (!sentimentData || !Array.isArray(sentimentData.assets) || !vaults || !Array.isArray(vaults)) {
            return []
        }

        // Create a map of vaults by symbol for quick lookup
        const vaultMap = new Map(vaults.map(v => [v.symbol, v]))

        // Map sentiment assets to tokens, matching with vault data
        const mappedTokens = sentimentData.assets
            .map(asset => {
                const vault = vaultMap.get(asset.symbol)
                if (!vault) return null

                // Calculate total shares (use a reasonable default if not available)
                // In production, this should come from vault supply data
                const totalShare = asset.totalSharesTraded || 1000000 // Default fallback
                const tradedShare = asset.sharesBought

                return {
                    symbol: asset.symbol || '',
                    name: vault.name || asset.symbol || '',
                    image_url: vault.imageUrl || '',
                    total_share: totalShare,
                    traded_share: tradedShare || 0,
                    uniqueBuyers: asset.uniqueBuyers || 0,
                    sharesBought: asset.sharesBought || 0,
                    sharesSold: asset.sharesSold || 0,
                    tradingVolume5M: asset.tradingVolume5M || 0,
                    tradingVolume1H: asset.tradingVolume1H || 0,
                    tradingVolume24H: asset.tradingVolume24H || 0,
                    tradingVolume1W: asset.tradingVolume1W || 0,
                    avgSharesPerUser: asset.avgSharesPerUser || 0,
                }
            })
            .filter((token): token is Token => token !== null)
            // Sort by buying activity (ascending - least to most)
            .sort((a, b) => a.sharesBought - b.sharesBought)

        return mappedTokens
    }, [sentimentData, vaults])

    const isLoading = sentimentLoading || vaultsLoading || subscriptionLoading
    // Calculate fill percentage for sentiment bar
    const getFillPercentage = (token: Token): number => {
        if (token.total_share === 0) return 0
        return Math.min(100, (token.traded_share / token.total_share) * 100)
    }

    // Get trading volume based on time frame
    const getTradingVolume = (token: Token, frame: TimeFrame): number => {
        switch (frame) {
            case '5M': return token.tradingVolume5M
            case '1H': return token.tradingVolume1H
            case '24H': return token.tradingVolume24H
            case '1W': return token.tradingVolume1W
            default: return token.tradingVolume5M
        }
    }

    return (
        <>
            <div className="grid gap-3 px-4 py-5 bg-gray-850">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="font-offbit font-bold text-body-lg uppercase text-white">what people are buying</h1>
                        <p className="font-offbit font-bold uppercase text-body-md text-gray-[#B8B8CC]">Spot trends based on real-time community <br /> sentiment</p>
                    </div>
                    <SubscriptionStatus className="text-right" />
                </div>
                
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <p className="font-offbit text-gray-400">Loading sentiment data...</p>
                    </div>
                ) : !hasAccess ? (
                    <UpgradeToView />
                ) : (sentimentError || vaultsError) ? (
                    <div className="flex items-center justify-center py-8">
                        <p className="font-offbit text-red-400">Error loading data. Please try again later.</p>
                    </div>
                ) : tokens.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                        <p className="font-offbit text-gray-400">No trading data available yet</p>
                    </div>
                ) : (
                    <>
                        <div className={cn("grid gap-3 h-[calc(72px+24px)] overflow-hidden", show && "h-min")}>
                            {tokens.map((el, idx) => {
                                const fillPercentage = getFillPercentage(el)
                                return (
                                    <div key={`${el.symbol}-${idx}`} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="size-5 rounded-full overflow-hidden bg-gray-400">
                                                {el.image_url ? (
                                                    <img 
                                                        src={el.image_url} 
                                                        alt={el.name} 
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                        }}
                                                    />
                                                ) : null}
                                                <div className={`w-full h-full bg-gray-400 flex items-center justify-center ${el.image_url ? 'hidden' : ''}`}>
                                                    <span className="text-xs font-bold">{el.symbol.charAt(0)}</span>
                                                </div>
                                            </div>
                                            <p className="font-offbit font-bold text-body-lg">{el.symbol}</p>
                                        </div>
                                        <div className="flex items-center gap-3 w-[218px]">
                                            <div className="w-[190px] h-6">
                                                <SentimentComponent
                                                    fillPercentage={fillPercentage}
                                                    fillColor="#00FFA1"
                                                    bgColor="#32324D"
                                                    containerWidth={190}
                                                    barHeight={24}
                                                    barWidth={3.65} />
                                            </div>
                                            <button className="size-4" onClick={() => {
                                                setActiveToken(el)
                                                setOpen(true)
                                            }}><InfoIcon /></button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        {tokens.length > 3 && (
                            <button className="font-offbit font-bold text-body-md underline uppercase text-gray-200" onClick={() => setShow(!show)}>
                                {show ? "Show less" : "show more"}
                            </button>
                        )}
                    </>
                )}
                {activeToken && (
                    <BottomSheet isOpen={open} onClose={() => setOpen(false)}>
                        <div className="grid gap-6">
                            <div className="flex items-center justify-between">
                                <h1 className="font-offbit font-bold text-title-lg uppercase">asset detail</h1>
                                <button onClick={() => setOpen(false)}><SquareCloseIcon /></button>
                            </div>
                            <div className="grid gap-4">
                                <div className="flex items-center gap-2 font-offbit font-bold text-title-lg">
                                    <p className="">{activeToken.symbol}</p>
                                    <p className="text-gray-400">{activeToken.name}</p>
                                </div>
                                <div className="flex items-end gap-2">
                                    <p className="font-offbit text-heading-md font-bold">
                                        ${(getTradingVolume(activeToken, timeFrame) / 1_000_000).toFixed(2)}
                                    </p>
                                    <div className="mb-1 flex items-center gap-1">
                                        <p className="font-bold font-offbit text-body-lg uppercase text-[#00FF00]">
                                            {timeFrame}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div className="grid gap-[1px] grid-cols-2">
                                    <div className="w-full bg-gray-700 p-3">
                                        <p className="font-bold font-offbit text-sm uppercase text-gray-300 leading-[100%] tracking-[4%]">Total Points</p>
                                        <p className="font-bold font-offbit text-sm uppercase leading-[100%] tracking-[4%]">2,045 pts</p>
                                    </div>
                                    <div className="w-full bg-gray-700 p-3">
                                        <p className="font-bold font-offbit text-sm uppercase text-gray-300 leading-[100%] tracking-[4%]">Last GW</p>
                                        <p className="font-bold font-offbit text-sm uppercase leading-[100%] tracking-[4%]">1,800 PTS</p>
                                    </div>
                                </div>
                                <div className="grid gap-[1px] grid-cols-3">
                                    <div className="w-full bg-gray-850 p-3">
                                        <p className="font-bold font-offbit text-sm uppercase text-gray-300 leading-[100%] tracking-[4%]">GW 7</p>
                                        <p className="font-bold font-offbit text-sm uppercase leading-[100%] tracking-[4%]">2,045 PTS</p>
                                    </div>
                                    <div className="w-full bg-gray-850 p-3">
                                        <p className="font-bold font-offbit text-sm uppercase text-gray-300 leading-[100%] tracking-[4%]">GW 6</p>
                                        <p className="font-bold font-offbit text-sm uppercase leading-[100%] tracking-[4%]">1,800 pts</p>
                                    </div>
                                    <div className="w-full bg-gray-850 p-3">
                                        <p className="font-bold font-offbit text-sm uppercase text-gray-300 leading-[100%] tracking-[4%]">GW 5</p>
                                        <p className="font-bold font-offbit text-sm uppercase leading-[100%] tracking-[4%]">1,800 pts</p>
                                    </div>
                                </div>
                            </div>
                            <div className="w-full h-[46px] grid gap-2">
                                <div className="flex items-center justify-between px-2">
                                    <DottedLeftArrow />
                                    <p className="font-bold font-offbit text-[9px] uppercase leading-[100%] tracking-[4%]">
                                        {getFillPercentage(activeToken).toFixed(1)}% of traded share
                                    </p>
                                    <DottedRightArrow />
                                </div>
                                <SentimentComponent
                                    fillPercentage={getFillPercentage(activeToken)}
                                    fillColor="#00FFA1"
                                    bgColor="#32324D"
                                    containerWidth={315}
                                    barHeight={32}
                                    barWidth={5.36} />
                            </div>
                            <div className="grid gap-2">
                                <div className="w-48 p-1 bg-gray-700 grid grid-cols-4 font-bold font-offbit">
                                    <button className={cn(timeFrame === '5M' ? "bg-gray-100 text-black" : "text-gray-300")} onClick={() => setTimeFrame("5M")}>5M</button>
                                    <button className={cn(timeFrame === '1H' ? "bg-gray-100 text-black" : "text-gray-300")} onClick={() => setTimeFrame("1H")}>1H</button>
                                    <button className={cn(timeFrame === '24H' ? "bg-gray-100 text-black" : "text-gray-300")} onClick={() => setTimeFrame("24H")}>24H</button>
                                    <button className={cn(timeFrame === '1W' ? "bg-gray-100 text-black" : "text-gray-300")} onClick={() => setTimeFrame("1W")}>1W</button>
                                </div>
                                <div className="grid border border-gray-600">
                                    <div className="flex items-center gap-2 px-2 py-[15px] border-b border-b-gray-600">
                                        <p className="font-offbit font-bold text-sm leading-[100%] tracking-[4%] uppercase">
                                            {activeToken.uniqueBuyers}
                                        </p>
                                        <p className="font-offbit font-bold text-sm leading-[100%] tracking-[4%] uppercase text-gray-300">Unique Buyers</p>
                                    </div>
                                    <div className="flex items-center gap-2 px-2 py-[15px] border-b border-b-gray-600">
                                        <p className="font-offbit font-bold text-sm leading-[100%] tracking-[4%] uppercase text-[#00FF00]">
                                            +{activeToken.sharesBought}
                                        </p>
                                        <p className="font-offbit font-bold text-sm leading-[100%] tracking-[4%] uppercase text-gray-300">Shares Bought</p>
                                    </div>
                                    <div className="flex items-center gap-2 px-2 py-[15px] border-b border-b-gray-600">
                                        <p className="font-offbit font-bold text-sm leading-[100%] tracking-[4%] uppercase">
                                            {activeToken.sharesSold}
                                        </p>
                                        <p className="font-offbit font-bold text-sm leading-[100%] tracking-[4%] uppercase text-gray-300">Shares Sold</p>
                                    </div>
                                    <div className="flex items-center gap-2 px-2 py-[15px] border-b border-b-gray-600">
                                        <p className="font-offbit font-bold text-sm leading-[100%] tracking-[4%] uppercase text-[#00FF00]">
                                            ${(getTradingVolume(activeToken, timeFrame) / 1_000_000).toFixed(2)}
                                        </p>
                                        <p className="font-offbit font-bold text-sm leading-[100%] tracking-[4%] uppercase text-gray-300">
                                            Volume ({timeFrame})
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 px-2 py-[15px]">
                                        <p className="font-offbit font-bold text-sm leading-[100%] tracking-[4%] uppercase">
                                            {activeToken.avgSharesPerUser.toFixed(1)}
                                        </p>
                                        <p className="font-offbit font-bold text-sm leading-[100%] tracking-[4%] uppercase text-gray-300">avg. shares/user</p>
                                    </div>
                                </div>
                            </div>
                            <Button>Buy Now</Button>
                        </div>
                    </BottomSheet>
                )}
            </div>
        </>
    )
}

export default HomeWhatPeopleBuy