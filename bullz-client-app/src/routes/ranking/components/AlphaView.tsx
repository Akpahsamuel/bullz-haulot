import AlphaIcon from "@/components/icons/alpha.icon";
import ChevronLeft from "@/components/icons/chevron-right"
import AlphaPlatform from "@/components/svg/alpha-platfom";
import { cn } from "@/lib/utils"
import React from "react"
import { useCompetitionState, fetchAvailableWeeks } from "@/hooks/useCompetitionData"
import { useVaults } from "@/hooks/useVaults"
import { useQuery } from "@tanstack/react-query"

type AlphaCoins = {
  image_url: string
  name: string
  network: string
  change: string
  asset: number
  symbol: string
  category: string
}

const AlphaView = () => {
  const [coinType, setCoinType] = React.useState("LARGE")
  const [selectedWeek, setSelectedWeek] = React.useState<number | undefined>(undefined)
  const [showWeekSelector, setShowWeekSelector] = React.useState(false)
  
  const coinOpts: Array<string> = [
    "LARGE",
    "MID",
    "SMALL",
    "MEMES"
  ]

  const { data: competitionState } = useCompetitionState(selectedWeek)
  const { data: vaults } = useVaults()
  const { data: availableWeeks } = useQuery({
    queryKey: ["available-weeks"],
    queryFn: fetchAvailableWeeks,
  })

 
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.week-selector-container')) {
        setShowWeekSelector(false)
      }
    }
    if (showWeekSelector) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showWeekSelector])


  const Players: Array<AlphaCoins> = React.useMemo(() => {
    if (!competitionState) {
      return []
    }

    const vaultMap = new Map(vaults?.map(v => [v.symbol, v]) || [])

    const assetPointsMap = new Map(
      (competitionState.asset_points || []).map(ap => [ap.symbol, ap.points])
    )

    const participantAssets = new Set<string>()
    if (competitionState.participants && competitionState.participants.length > 0) {
      competitionState.participants.forEach(participant => {
        let symbols: string[] = []
        
        if (participant.symbols) {
          if (Array.isArray(participant.symbols)) {
            symbols = participant.symbols
          } else if (typeof participant.symbols === 'string') {
            symbols = [participant.symbols]
          } else if (typeof participant.symbols === 'object' && 'fields' in participant.symbols && Array.isArray((participant.symbols as any).fields)) {
            symbols = (participant.symbols as any).fields
          }
        }
        
        if (participant.vaultBalances && typeof participant.vaultBalances === 'object') {
          const balanceSymbols = Object.keys(participant.vaultBalances)
          symbols = [...symbols, ...balanceSymbols]
        }
        
        symbols.forEach(symbol => {
          if (symbol && String(symbol).trim() !== '') {
            participantAssets.add(String(symbol).trim().toUpperCase())
          }
        })
      })
    }

    const allAssetSymbols = new Set<string>()
    
    if (competitionState.asset_points) {
      competitionState.asset_points.forEach(ap => {
        if (ap.symbol) {
          allAssetSymbols.add(String(ap.symbol).trim().toUpperCase())
        }
      })
    }
    
    participantAssets.forEach(symbol => {
      allAssetSymbols.add(symbol) 
    })

    const assets = Array.from(allAssetSymbols)
      .map(symbol => {
        let vault = vaultMap.get(symbol)
        if (!vault) {
          for (const [vaultSymbol, vaultData] of vaultMap.entries()) {
            if (vaultSymbol.toUpperCase() === symbol.toUpperCase()) {
              vault = vaultData
              break
            }
          }
        }
            const points = assetPointsMap.get(symbol) || assetPointsMap.get(symbol.toUpperCase()) || 0 
        
        if (!vault) {
          return {
            image_url: "",
            name: symbol,
            network: "", 
            change: "0.00",
            asset: 0, 
            symbol: symbol,
            category: "UNKNOWN",
          }
        }

        const percentageChange = points / 10
        const change = percentageChange > 0 ? `+${percentageChange.toFixed(2)}` : percentageChange < 0 ? `${percentageChange.toFixed(2)}` : "0.00"

        let network = ""
        const symbolUpper = symbol.toUpperCase()
        if (symbolUpper.includes("SOL") || vault.name?.toLowerCase().includes("solana")) {
          network = "solana"
        } else if (symbolUpper.includes("BTC") || vault.name?.toLowerCase().includes("bitcoin")) {
          network = "bitcoin"
        } else if (symbolUpper.includes("ETH") || vault.name?.toLowerCase().includes("ethereum")) {
          network = "ethereum"
        } else {
          network = "" 
        }

        return {
          image_url: vault.imageUrl || "",
          name: vault.name || symbol,
          network: network,
          change,
          asset: points, 
          symbol: symbol,
          category: vault.category, 
        }
      })
      .filter((item): item is AlphaCoins => {
        if (!item) {
          return false
        }
        
        if (item.category === "UNKNOWN") {
          return true
        }
        
        // TODO: Re-enable category filtering once assets are properly categorized
        // For now, show all assets regardless of category since assets were registered without proper categories
        // const mappedCategory = categoryMap[item.category] || item.category.toUpperCase()
        // const matches = mappedCategory === coinType
        // return matches
        
        // Temporarily show all registered assets regardless of category
        return true
      })
      .sort((a, b) => b.asset - a.asset) 

    return assets
  }, [competitionState, vaults, coinType])

  const top3 = Players.slice(0, 3)
  const rest = Players.slice(3)

  return (
    <>
      <div
        className="w-full bg-gray-700 grid place-content-center p-2 relative"
        style={{ backgroundImage: "linear-gradient(to left, #000019, #00001900, #000019)" }}
      >
        <div className="flex items-center gap-2 relative week-selector-container">
          <p className="font-offbit font-bold text-[17px] leading-[100%] tracking-[4%] uppercase">
            gameweek {competitionState ? competitionState.week_index : 0}
          </p>
          <div 
            className="cursor-pointer relative"
            onClick={() => setShowWeekSelector(!showWeekSelector)}
          >
            <ChevronLeft className={cn("rotate-180 transition-transform", showWeekSelector && "rotate-90")} />
            {showWeekSelector && availableWeeks && availableWeeks.length > 0 && (
              <div className="absolute top-full left-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto min-w-[150px]">
                <div
                  className={cn(
                    "px-4 py-2 cursor-pointer hover:bg-gray-700 text-sm border-b border-gray-700",
                    !selectedWeek && "bg-gray-700"
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedWeek(undefined)
                    setShowWeekSelector(false)
                  }}
                >
                  Current Week
                </div>
                {availableWeeks.map(({ week, metadata }) => (
                  <div
                    key={week}
                    className={cn(
                      "px-4 py-2 cursor-pointer hover:bg-gray-700 text-sm",
                      selectedWeek === week && "bg-gray-700"
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedWeek(week)
                      setShowWeekSelector(false)
                    }}
                  >
                    Week {week}
                    {metadata.participantCount > 0 && (
                      <span className="text-gray-400 ml-2">({metadata.participantCount})</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="h-40">
        <img src="/competition/walrus-comp-large.png" />
      </div>
      <div className="w-full bg-[#161626] grid grid-cols-4 gap-1 p-1">
        {coinOpts.map((el, idx) => (
          <p key={idx}
            className={cn("py-2 px-3 font-bold font-offbit leading-[100%] tracking-[4%] uppercase text-gray-400 text-center", el === coinType && "bg-gray-700 text-white")}
            onClick={() => setCoinType(el)}
          >{el}</p>
        ))}
      </div>
      <div className="w-full relative">
        <div>
          <div className="grid grid-cols-3 max-w-[318px] mx-auto items-center">
            {top3.length > 0 ? (
              <>
                {top3[2] && (
                  <div className="flex flex-col items-center translate-y-[1.8rem] gap-2">
                    <div className="size-14 rounded-full bg-gray-700 overflow-hidden">
                      {top3[2].image_url && <img src={top3[2].image_url} alt={top3[2].name} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex items-center flex-col gap-1">
                      <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[17px] text-gray-400">b{top3[2].symbol}</p>
                      <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[14px] text-gray-500">{top3[2].name}</p>
                      <div className="flex items-center gap-1">
                        <AlphaIcon />
                        <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[17px] text-white">{top3[2].asset}</p>
                      </div>
                      <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[14px] text-[#00FF00]">{top3[2].change}%</p>
                    </div>
                  </div>
                )}
                {top3[1] && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="size-14 rounded-full bg-gray-700 overflow-hidden">
                      {top3[1].image_url && <img src={top3[1].image_url} alt={top3[1].name} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex items-center flex-col gap-1">
                      <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[17px] text-gray-400">b{top3[1].symbol}</p>
                      <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[14px] text-gray-500">{top3[1].name}</p>
                      <div className="flex items-center gap-1">
                        <AlphaIcon />
                        <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[17px] text-white">{top3[1].asset}</p>
                      </div>
                      <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[14px] text-[#00FF00]">{top3[1].change}%</p>
                    </div>
                  </div>
                )}
                {top3[0] && (
                  <div className="flex flex-col items-center translate-y-[1.8rem] gap-2">
                    <div className="size-14 rounded-full bg-gray-700 overflow-hidden">
                      {top3[0].image_url && <img src={top3[0].image_url} alt={top3[0].name} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex items-center flex-col gap-1">
                      <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[17px] text-gray-400">b{top3[0].symbol}</p>
                      <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[14px] text-gray-500">{top3[0].name}</p>
                      <div className="flex items-center gap-1">
                        <AlphaIcon />
                        <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[17px] text-white">{top3[0].asset}</p>
                      </div>
                      <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[14px] text-[#00FF00]">{top3[0].change}%</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              // Placeholder when no data
              <>
                <div className="flex flex-col items-center translate-y-[1.8rem] gap-2">
                  <div className="size-14 rounded-full bg-gray-700"></div>
                  <div className="flex items-center flex-col gap-1">
                    <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[17px] text-gray-400">-</p>
                    <div className="flex items-center gap-1">
                      <AlphaIcon />
                      <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[17px] text-white">0</p>
                    </div>
                    <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[14px] text-[#00FF00]">0%</p>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="size-14 rounded-full bg-gray-700"></div>
                  <div className="flex items-center flex-col gap-1">
                    <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[17px] text-gray-400">-</p>
                    <div className="flex items-center gap-1">
                      <AlphaIcon />
                      <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[17px] text-white">0</p>
                    </div>
                    <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[14px] text-[#00FF00]">0%</p>
                  </div>
                </div>
                <div className="flex flex-col items-center translate-y-[1.8rem] gap-2">
                  <div className="size-14 rounded-full bg-gray-700"></div>
                  <div className="flex items-center flex-col gap-1">
                    <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[17px] text-gray-400">-</p>
                    <div className="flex items-center gap-1">
                      <AlphaIcon />
                      <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[17px] text-white">0</p>
                    </div>
                    <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[14px] text-[#00FF00]">0%</p>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="grid grid-cols-3">
            <div className="col-span-3 flex place-content-center h-32 overflow-hidden">
              <AlphaPlatform />
            </div>
          </div>
        </div>
        <div className="w-full sticky top-0">
          {rest.length > 0 ? (
            rest.map((el, idx) => (
              <div key={el.symbol} className="flex items-center justify-between w-full p-4 bg-[#161626]">
                <div className="flex items-center gap-3">
                  <p className="font-bold font-offbit leading-[100%] tracking-[4%] text-[14px] p-2">{idx + 4}</p>
                  <div className="flex items-center gap-1">
                    <div className="size-8 bg-gray-700 rounded-full overflow-hidden">
                      {el.image_url && <img src={el.image_url} alt={el.name} className="w-full h-full object-cover" />}
                    </div>
                    <div>
                      <p className="font-bold font-offbit leading-[100%] tracking-[4%] text-[17px]">b{el.symbol}</p>
                      <p className="font-bold font-offbit leading-[100%] tracking-[4%] text-[14px] text-gray-400">{el.name}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[17px] text-[#00FF00]">{el.change}%</p>
                  <div className="flex items-center gap-1 flex-col">
                    <p className="font-bold font-offbit uppercase leading-[100%] tracking-[4%] text-[9px] text-gray-300">alpha</p>
                    <div className="flex items-center gap-1">
                      <AlphaIcon />
                      <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[17px] text-white">{el.asset}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center w-full p-8 text-gray-400">
              <p className="font-offbit">No assets found for this category</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default AlphaView
