import USDCIcon from "@/components/icons/usdc.icon"
import { UserAsset } from "@/hooks/useUserPortfolio"

interface BoughtSharesProps {
    portfolio: UserAsset[]
}

const BoughtShares = ({ portfolio }: BoughtSharesProps) => {
    return (
        <>
            <div className="grid grid-cols-3 gap-1">
                {portfolio.map((asset, index) => {
                    return (
                        <div key={`${asset.symbol}-${index}`} className="grid">
                            <div className="p-1 bg-white">
                                <div className="h-[100px] bg-gray-400 flex items-center justify-center overflow-hidden">
                                    {asset.imageUrl ? (
                                        <img 
                                            src={asset.imageUrl} 
                                            alt={asset.name || asset.symbol}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                            }}
                                        />
                                    ) : null}
                                    <div className={`w-full h-full bg-gray-400 flex items-center justify-center ${asset.imageUrl ? 'hidden' : ''}`}>
                                        <p className="font-bold text-white text-lg">{asset.symbol}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-center gap-1 bg-white p-1">
                                <p className="font-bold font-offbit text-[17px] leading-[100%] tracking-[4%] uppercase text-black">
                                    {asset.balanceFormatted}
                                </p>
                                <p className="font-bold font-offbit text-[17px] leading-[100%] tracking-[4%] text-gray-400">
                                    {asset.symbol}
                                </p>
                            </div>
                            <div className="bg-white grid grid-cols-2 p-1">
                                <div className="flex items-center justify-center flex-col gap-1">
                                    <p className="font-bold font-offbit text-[9px] leading-[100%] tracking-[4%] text-gray-400 uppercase">USDC</p>
                                    <div className="flex items-center justify-center gap-1">
                                        <USDCIcon width={10} height={10} />
                                        <p className="font-bold font-offbit text-[14px] leading-[100%] tracking-[4%] text-black">
                                            {asset.valueUsd}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-center flex-col gap-1">
                                    <p className="font-bold font-offbit text-[9px] leading-[100%] tracking-[4%] text-black uppercase">p/l</p>
                                    <p className={`font-bold font-offbit text-[17px] leading-[100%] tracking-[4%] uppercase ${
                                        asset.change24h >= 0 ? 'text-green-500' : 'text-red-500'
                                    }`}>
                                        {asset.change24h >= 0 ? '+' : ''}{(asset.change24h * 100).toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </>
    )
}

export default BoughtShares