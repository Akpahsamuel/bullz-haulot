import ExternalLinkIcon from "@/components/icons/external-link.icon"
import SeeMoreIcon from "@/components/icons/see-more.icon"
import XSocialIcon from "@/components/icons/x-social.icon"
import { useVaultInfo } from "@/hooks/useVaults"
import { useVaultPrice } from "@/hooks/useVaults"

interface ShareSummaryProps {
    vaultId?: string
}

const ShareSummary = ({ vaultId }: ShareSummaryProps) => {
    const { data: vaultInfo, isLoading: vaultInfoLoading } = useVaultInfo(vaultId || '')
    const { data: priceData } = useVaultPrice(vaultId || '')
    
    if (vaultInfoLoading || !vaultInfo) {
        return (
            <div className="grid gap-4">
                <div className="size-10 bg-gray-400 animate-pulse"></div>
                <div className="flex items-center gap-2 font-offbit font-bold text-[22px] leading-[100%] tracking-[4%]">
                    <p className="animate-pulse bg-gray-700 h-6 w-20 rounded"></p>
                    <p className="animate-pulse bg-gray-700 h-6 w-24 rounded"></p>
                </div>
                <div className="flex items-end gap-2">
                    <p className="animate-pulse bg-gray-700 h-8 w-32 rounded"></p>
                    <div className="mb-1 flex items-center gap-1">
                        <p className="animate-pulse bg-gray-700 h-4 w-16 rounded"></p>
                        <p className="animate-pulse bg-gray-700 h-4 w-8 rounded"></p>
                    </div>
                </div>
            </div>
        )
    }

    // Price conversion: calculateVaultPrice returns (usdc_reserve * 1_000_000_000) / trading_supply
    // To get price per smallest unit: price / 1_000_000_000
    const price = priceData ? parseFloat(priceData) / 1_000_000_000 : 0 // Convert to USDC per bBNB (smallest unit)
    // Mock price change for now
    const change = Math.random() * 0.3 - 0.15
    const isPositive = change >= 0

    return (
        <div className="grid gap-4">
            <div className="size-10 bg-gray-400 rounded-full overflow-hidden">
                {vaultInfo.imageUrl ? (
                    <img 
                        src={String(vaultInfo.imageUrl)} 
                        alt={String(vaultInfo.name)}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                    />
                ) : null}
                <div className={`w-full h-full bg-gray-400 flex items-center justify-center ${vaultInfo.imageUrl ? 'hidden' : ''}`}>
                    <span className="text-sm font-bold">{String(vaultInfo.symbol).charAt(0)}</span>
                </div>
            </div>
            <div className="flex items-center gap-2 font-offbit font-bold text-[22px] leading-[100%] tracking-[4%]">
                <p className="">{vaultInfo.symbol}</p>
                <p className="text-gray-400">{vaultInfo.name || vaultInfo.symbol}</p>
            </div>
            <div className="flex items-end gap-2">
                <p className="font-offbit text-[34px] leading-[100%] tracking-[4%] font-bold">${price > 0 && price < 0.01 ? price.toFixed(12) : price.toFixed(2)}</p>
                <div className="mb-1 flex items-center gap-1">
                    <p className={`font-bold font-offbit text-[17px] uppercase leading-[100%] tracking-[4%] ${isPositive ? 'text-[#00FF00]' : 'text-[#FF9999]'}`}>
                        {isPositive ? '+' : '-'}{(Math.abs(change) * 100).toFixed(2)}%
                    </p>
                    <p className="font-bold font-offbit text-[17px] uppercase text-gray-300 leading-[100%] tracking-[4%]">(1H)</p>
                </div>
            </div>
            <div>
                <div className="grid gap-[1px] grid-cols-2">
                    <div className="w-full bg-gray-700 p-3">
                        <p className="font-bold font-offbit text-sm uppercase text-gray-300 leading-[100%] tracking-[4%] mb-2">Total Points</p>
                        <p className="font-bold font-offbit text-sm uppercase leading-[100%] tracking-[4%]">2,045 pts</p>
                    </div>
                    <div className="w-full bg-gray-700 p-3">
                        <p className="font-bold font-offbit text-sm uppercase text-gray-300 leading-[100%] tracking-[4%] mb-2">Last GW</p>
                        <p className="font-bold font-offbit text-sm uppercase leading-[100%] tracking-[4%]">1,800 PTS</p>
                    </div>
                </div>
                <div className="grid gap-[1px] grid-cols-3">
                    <div className="w-full bg-gray-850 p-3">
                        <p className="font-bold font-offbit text-sm uppercase text-gray-300 leading-[100%] tracking-[4%] mb-2">GW 7</p>
                        <p className="font-bold font-offbit text-sm uppercase leading-[100%] tracking-[4%]">2,045 PTS</p>
                    </div>
                    <div className="w-full bg-gray-850 p-3">
                        <p className="font-bold font-offbit text-sm uppercase text-gray-300 leading-[100%] tracking-[4%] mb-2">GW 6</p>
                        <p className="font-bold font-offbit text-sm uppercase leading-[100%] tracking-[4%]">1,800 pts</p>
                    </div>
                    <div className="w-full bg-gray-850 p-3">
                        <p className="font-bold font-offbit text-sm uppercase text-gray-300 leading-[100%] tracking-[4%] mb-2">GW 5</p>
                        <p className="font-bold font-offbit text-sm uppercase leading-[100%] tracking-[4%]">1,800 pts</p>
                    </div>
                </div>
            </div>
            <div>
                <p className="font-bold font-offbit text-[17px] leading-[100%] tracking-[4%] text-gray-300">
                    {vaultInfo.description || `${vaultInfo.name} is a decentralized platform that runs smart contracts, enabling secure and transparent transactions. Its blockchain...`}
                </p>
                <div className="flex items-center gap-0.5">
                    <button className="flex items-center justify-center gap-1 py-1 px-2 bg-gray-700">
                        <span className="font-bold font-offbit text-sm uppercase text-gray-300 leading-[100%] tracking-[4%]">read more</span>
                        <div className="size-4">
                            <SeeMoreIcon />
                        </div>
                    </button>
                    <a href="#" className="flex items-center gap-1 py-1 px-2 bg-gray-700">
                        <XSocialIcon />
                        <ExternalLinkIcon />
                    </a>
                    <a href="#" className="flex items-center gap-1 py-1 px-2 bg-gray-700">
                        <span className="font-bold font-offbit text-sm uppercase text-gray-300 leading-[100%] tracking-[4%]">website</span>
                        <div className="size-4">
                            <ExternalLinkIcon />
                        </div>
                    </a>
                </div>
            </div>

        </div>
    )
}

export default ShareSummary