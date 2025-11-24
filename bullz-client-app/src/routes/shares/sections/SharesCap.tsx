import { cn } from "@/lib/utils"
import React from "react"
import { useVaults } from "@/hooks/useVaults"
import { useSuiClient } from "@mysten/dapp-kit"
import { useQuery } from "@tanstack/react-query"
import { getVaultFields } from "@/hooks/utils/vaultFetchers"


function formatMarketCap(value: number): string {
    if (value >= 1_000_000_000) {
        return (value / 1_000_000_000).toFixed(1) + 'b'
    } else if (value >= 1_000_000) {
        return (value / 1_000_000).toFixed(1) + 'm'
    } else if (value >= 1_000) {
        return (value / 1_000).toFixed(1) + 'k'
    } else {
        return value.toFixed(2)
    }
}

type DayOpts = Array<string>
const SharesMarketCap = () => {
    const [day, setDay] = React.useState('d')
    const [view, setView] = React.useState('cap')
    const { data: vaults } = useVaults()
    const client = useSuiClient()
    
    const dayOpts: DayOpts = [
        "d",
        "w",
        "m",
        "y"
    ]

    
    const { data: totalMarketCapData, isLoading: isCalculating } = useQuery({
        queryKey: ['total-market-cap', vaults?.map(v => v.vaultId)],
        queryFn: async () => {
            if (!vaults || vaults.length === 0) {
                return { totalMarketCap: 0, priceChange: 0 }
            }

            let totalCap = 0
            const vaultFieldsPromises = vaults.map(async (vault) => {
                try {
                    const fields = await getVaultFields(client, vault.vaultId, false)
                    
                    if (!fields) {
                        return { symbol: vault.symbol, marketCap: 0 }
                    }

                    const usdcReserveValue = fields.usdc_reserve || fields.usdcReserve || '0'
                    const tradingSupplyValue = fields.trading_supply || fields.tradingSupply || '1'
                    const circulatingSupplyValue = fields.circulating_supply || fields.circulatingSupply || '0'

                    const usdcReserve = BigInt(usdcReserveValue.toString())
                    const tradingSupply = BigInt(tradingSupplyValue.toString())
                    const circulatingSupply = BigInt(circulatingSupplyValue.toString())

                    if (tradingSupply === BigInt(0)) {
                        return { symbol: vault.symbol, marketCap: 0 }
                    }

                    // Market cap = circulating_supply * price_per_smallest
                    // Where price_per_smallest = usdc_reserve / trading_supply
                    // IMPORTANT: With BigInt division, if usdc_reserve < trading_supply, the result is 0!
                    // So we need to calculate: (circulating_supply * usdc_reserve) / trading_supply
                    // This multiplies first, then divides, avoiding truncation to 0
                    const marketCap = (circulatingSupply * usdcReserve) / tradingSupply
                    const marketCapNumber = Number(marketCap)

                    return { symbol: vault.symbol, marketCap: marketCapNumber }
                } catch (error) {
                    return { symbol: vault.symbol, marketCap: 0 }
                }
            })

            const marketCapResults = await Promise.all(vaultFieldsPromises)
            totalCap = marketCapResults.reduce((sum, { marketCap }) => sum + marketCap, 0)


            // Mock price change for now I will chnage in priduction with historical value
            const priceChange = 0.15

            return { totalMarketCap: totalCap, priceChange }
        },
        enabled: !!vaults && vaults.length > 0,
        staleTime: 10000,
        refetchInterval: 30000,
    })

    const totalMarketCap = totalMarketCapData?.totalMarketCap || 0
    const priceChange = totalMarketCapData?.priceChange || 0

 
    const formattedMarketCap = formatMarketCap(totalMarketCap)
    const changeDisplay = priceChange >= 0 ? '+' : ''
    const changeColor = priceChange >= 0 ? 'text-[#00FF00]' : 'text-[#FF9999]'

    return (
        <div className="grid gap-4 p-4 bg-gray-850 h-[267px]">
            <div className="flex items-center justify-between">
                <h2 className="text-gray-200 font-offbit font-bold text-[17px] leading-[100%] tracking-[4%] uppercase">Total Market Cap</h2>
                <div className="max-w-[136px] w-full  bg-gray-700 p-1 flex items-center">
                    {dayOpts.map((el, idx) => (
                        <button key={idx} className={cn("w-full grid place-content-center py-1 px-2", day === el && "bg-white")} onClick={() => setDay(el)}><span className={cn("font-bold font-offbit text-[17px] leading-[100%] tracking-[4%] uppercase", day === el && "text-black")}>{el}</span></button>
                    ))}
                </div>
            </div>
            <div className="h-[calc(147px)]"></div>
            <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                    <p className="font-bold font-offbit text-[34px] leading-[100%] tracking-[4%] uppercase">
                        {isCalculating ? '...' : (totalMarketCap > 0 ? formattedMarketCap : '0.0m')}
                    </p>
                    <span className={cn("font-bold font-offbit text-[17px] leading-[100%] tracking-[4%] uppercase", changeColor)}>
                        {changeDisplay}{priceChange.toFixed(2)}%
                    </span>
                </div>
                <div className="flex items-center bg-gray-700 max-w-36 w-full p-1">
                    <button className={cn("w-full grid place-content-center py-1 px-2", view === "cap" && "bg-white")} onClick={() => setView("cap")}><span className={cn("font-bold font-offbit text-[17px] leading-[100%] tracking-[4%] uppercase", view === "cap" && "text-black")}>mcap</span></button>
                    <button className={cn("w-full grid place-content-center py-1 px-2", view === "vol" && "bg-white")} onClick={() => setView("vol")}><span className={cn("font-bold font-offbit text-[17px] leading-[100%] tracking-[4%] uppercase", view === "vol" && "text-black")}>vol</span></button>
                </div>
            </div>
        </div>
    )
}
export default SharesMarketCap