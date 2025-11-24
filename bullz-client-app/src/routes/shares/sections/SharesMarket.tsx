import ChevronLeft from "@/components/icons/chevron-right"
import SearchIcon from "@/components/icons/search.icon"
import { cn } from "@/lib/utils"
import { Link } from "react-router"
import { useVaults } from "@/hooks/useVaults"
import { useVaultPrice } from "@/hooks/useVaults"
import { useState, useMemo } from "react"

// Individual vault item component to handle price fetching
const VaultItem = ({ vault }: { vault: any }) => {
    const { data: priceData } = useVaultPrice(vault.vaultId)
    
    // Mock price change for now - in real implementation this would come from price history
    const change = Math.random() * 0.3 - 0.15 // Random change between -15% and +15%
    const growth = change >= 0 ? 'positive' : 'negative'
    
    // Price conversion: calculateVaultPrice returns (usdc_reserve * 1_000_000_000) / trading_supply
    // To get price per smallest unit in USDC: price / 1_000_000_000
    const price = priceData ? parseFloat(priceData) / 1_000_000_000 : 0 // Convert to USDC per bBNB (smallest unit)
    
    return (
        <Link to={`/shares/${vault.vaultId}`} className="not-last:border-b not-last:border-b-gray-800">
            <div className="flex items-center gap-2 justify-between p-4 h-16 ">
                <div className="flex items-center gap-2 flex-1">
                    <div className="size-8 bg-gray-400 overflow-hidden">
                        {vault.imageUrl ? (
                            <img 
                                src={vault.imageUrl} 
                                alt={vault.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                            />
                        ) : null}
                        <div className={`w-full h-full bg-gray-400 flex items-center justify-center ${vault.imageUrl ? 'hidden' : ''}`}>
                            <span className="text-xs font-bold">{vault.symbol.charAt(0)}</span>
                        </div>
                    </div>
                    <div>
                        <p className="font-bold font-offbit leading-[100%] tracking-[4%] text-[17px]">{vault.name || vault.symbol}</p>
                        <p className="font-bold font-offbit leading-[100%] tracking-[4%] text-[14px] text-gray-400">{vault.symbol}</p>
                    </div>
                </div>
                <div>
                    <p className="font-bold font-offbit leading-[100%] tracking-[4%] text-[14px] text-gray-400 uppercase">Price</p>
                    <p className="font-bold font-offbit leading-[100%] tracking-[4%] text-[17px] ">${price > 0 && price < 0.01 ? price.toFixed(12) : price.toFixed(2)}</p>
                </div>
                <div>
                    <p className="font-bold font-offbit leading-[100%] tracking-[4%] text-[14px] text-gray-400 uppercase">1h</p>
                    <p className={cn("font-bold font-offbit leading-[100%] tracking-[4%] text-[17px]", growth === 'positive' ? "text-[#00FF00]" : "text-[#FF9999]")}>{growth === 'negative' ? "-" : "+"}{(Math.abs(change) * 100).toFixed(2)}%</p>
                </div>
                <ChevronLeft className=" rotate-180" />
            </div>
        </Link>
    )
}

const SharesMarket = () => {
    const { data: vaults, isLoading: vaultsLoading, error: vaultsError } = useVaults()
    const [searchTerm, setSearchTerm] = useState("")

    // Filter vaults based on search term
    const filteredVaults = useMemo(() => {
        if (!vaults || !searchTerm) return vaults || []
        
        return vaults.filter(vault => {
            const name = vault.name || vault.symbol
            return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   vault.symbol.toLowerCase().includes(searchTerm.toLowerCase())
        })
    }, [vaults, searchTerm])

    if (vaultsLoading) {
        return (
            <div className="grid gap-4">
                <div className="bg-gray-800 w-full h-10 px-3 py-2 border border-gray-700 flex items-center gap-2">
                    <SearchIcon />
                    <input 
                        type="text" 
                        style={{ fontFamily: "inherit", fontSize: "17px", textTransform: 'uppercase', fontWeight: 'bold' }} 
                        className="w-full outline-0 placeholder:font-offbit placeholder:font-bold placeholder:uppercase placeholder:text-[17px] placeholder:leading-[100%] placeholder:tracking-[4%] p-0" 
                        placeholder="search assets" 
                        disabled
                    />
                </div>
                <div className="flex flex-col overflow-y-scroll border border-gray-800 h-94">
                    <div className="flex items-center justify-center p-8">
                        <p className="text-gray-400 text-body-md uppercase font-offbit font-bold">Loading vaults...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (vaultsError) {
        return (
            <div className="grid gap-4">
                <div className="bg-gray-800 w-full h-10 px-3 py-2 border border-gray-700 flex items-center gap-2">
                    <SearchIcon />
                    <input 
                        type="text" 
                        style={{ fontFamily: "inherit", fontSize: "17px", textTransform: 'uppercase', fontWeight: 'bold' }} 
                        className="w-full outline-0 placeholder:font-offbit placeholder:font-bold placeholder:uppercase placeholder:text-[17px] placeholder:leading-[100%] placeholder:tracking-[4%] p-0" 
                        placeholder="search assets" 
                        disabled
                    />
                </div>
                <div className="flex flex-col overflow-y-scroll border border-gray-800 h-94">
                    <div className="flex items-center justify-center p-8">
                        <p className="text-red-400 text-body-md uppercase font-offbit font-bold">Error loading vaults</p>
                    </div>
                </div>
            </div>
        )
    }
    return (
        <div className="grid gap-4">
            <div className="bg-gray-800 w-full h-10 px-3 py-2 border border-gray-700 flex items-center gap-2">
                <SearchIcon />
                <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ fontFamily: "inherit", fontSize: "17px", textTransform: 'uppercase', fontWeight: 'bold' }} 
                    className="w-full outline-0 placeholder:font-offbit placeholder:font-bold placeholder:uppercase placeholder:text-[17px] placeholder:leading-[100%] placeholder:tracking-[4%] p-0" 
                    placeholder="search assets" 
                />
            </div>
            <div className="flex flex-col overflow-y-scroll border border-gray-800 h-94">
                {filteredVaults.length === 0 ? (
                    <div className="flex items-center justify-center p-8">
                        <p className="text-gray-400 text-body-md uppercase font-offbit font-bold">No assets found</p>
                    </div>
                ) : (
                    filteredVaults.map((vault) => (
                        <VaultItem key={vault.vaultId} vault={vault} />
                    ))
                )}
            </div>
        </div >
    )
}

export default SharesMarket