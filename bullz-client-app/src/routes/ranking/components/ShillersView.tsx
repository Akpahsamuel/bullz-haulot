import ChevronLeft from "@/components/icons/chevron-right"
import ShillIcon from "@/components/icons/shill.icon"
import ShillerPlatform from "@/components/svg/shill-platform"
import { useCompetitionState, fetchAvailableWeeks } from "@/hooks/useCompetitionData"
import { shortenAddress } from "@/common-api-services/token-price.ts/utils"
import React from "react"
import { useQuery } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { useGetSquadNamesByObjectIds } from "@/lib/hooks/use-squad-contract"

type ShillerPlayers = {
  name: string
  points: number
  value: number
  address: string
  squad_id?: string
  squad_name?: string
}

const ShillerView = () => {
  const [selectedWeek, setSelectedWeek] = React.useState<number | undefined>(undefined)
  const [showWeekSelector, setShowWeekSelector] = React.useState(false)
  
  const { data: competitionState } = useCompetitionState(selectedWeek)
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


  const squadObjectIds = React.useMemo(() => {
    if (!competitionState) return []
    
    const ids = new Set<string>()
    
    
    if (competitionState.participants) {
      competitionState.participants.forEach(p => {
        if (p.squad_id && p.squad_id.startsWith("0x")) {
          ids.add(p.squad_id)
        }
      })
    }
    
    return Array.from(ids)
  }, [competitionState])


  const { data: squadNames = {} } = useGetSquadNamesByObjectIds(squadObjectIds)

  
  const Players: Array<ShillerPlayers> = React.useMemo(() => {
    if (!competitionState) {
      return []
    }

    if (competitionState.user_scores && competitionState.user_scores.length > 0) {
      return competitionState.user_scores
        .map(score => {
          const participant = competitionState.participants?.find(p => p.owner === score.owner)
          const squadId = participant?.squad_id
          const squadName = squadId ? (squadNames[squadId] || `Squad ${squadId.slice(0, 8)}...`) : undefined
          
          return {
            name: squadName || shortenAddress(score.owner, 6, 4),
            points: score.score,
            value: score.shill_points,
            address: score.owner,
            squad_id: squadId,
            squad_name: squadName,
          }
        })
        .sort((a, b) => b.points - a.points) 
    }

    if (competitionState.participants && competitionState.participants.length > 0) {
      return competitionState.participants
        .map(participant => {
          const squadId = participant.squad_id
          const squadName = squadId ? (squadNames[squadId] || `Squad ${squadId.slice(0, 8)}...`) : undefined
          
          return {
            name: squadName || shortenAddress(participant.owner, 6, 4),
            points: 0, 
            value: 0, 
            address: participant.owner,
            squad_id: squadId,
            squad_name: squadName,
          }
        })
        .sort((a, b) => b.points - a.points) 
    }

    return []
  }, [competitionState, squadNames])

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
      <div className="w-full relative">
        <div>
          <div className="grid grid-cols-3 max-w-[318px] mx-auto items-center">
            {top3.length > 0 ? (
              <>
                {top3[2] && (
                  <div className="flex flex-col items-center translate-y-[1.8rem] gap-2">
                    <div className="size-14 rounded-full bg-gray-700 overflow-hidden">
                      <img src="/images/profile.jpg" alt={top3[2].name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex items-center flex-col gap-1">
                      <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[14px] uppercase">{top3[2].name}</p>
                      <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[17px] uppercase">{top3[2].points} PTS</p>
                      <div className="flex items-center gap-1">
                        <ShillIcon />
                        <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[17px] text-white">{top3[2].value}</p>
                      </div>
                    </div>
                  </div>
                )}
                {top3[1] && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="size-14 rounded-full bg-gray-700 overflow-hidden">
                      <img src="/images/profile.jpg" alt={top3[1].name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex items-center flex-col gap-1">
                      <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[14px] uppercase">{top3[1].name}</p>
                      <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[17px] uppercase">{top3[1].points} PTS</p>
                      <div className="flex items-center gap-1">
                        <ShillIcon />
                        <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[17px] text-white">{top3[1].value}</p>
                      </div>
                    </div>
                  </div>
                )}
                {top3[0] && (
                  <div className="flex flex-col items-center translate-y-[1.8rem] gap-2">
                    <div className="size-14 rounded-full bg-gray-700 overflow-hidden">
                      <img src="/images/profile.jpg" alt={top3[0].name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex items-center flex-col gap-1">
                      <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[14px] uppercase">{top3[0].name}</p>
                      <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[17px] uppercase">{top3[0].points} PTS</p>
                      <div className="flex items-center gap-1">
                        <ShillIcon />
                        <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[17px] text-white">{top3[0].value}</p>
                      </div>
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
                    <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[14px] uppercase">-</p>
                    <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[17px] uppercase">0 PTS</p>
                    <div className="flex items-center gap-1">
                      <ShillIcon />
                      <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[17px] text-white">0</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="size-14 rounded-full bg-gray-700"></div>
                  <div className="flex items-center flex-col gap-1">
                    <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[14px] uppercase">-</p>
                    <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[17px] uppercase">0 PTS</p>
                    <div className="flex items-center gap-1">
                      <ShillIcon />
                      <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[17px] text-white">0</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-center translate-y-[1.8rem] gap-2">
                  <div className="size-14 rounded-full bg-gray-700"></div>
                  <div className="flex items-center flex-col gap-1">
                    <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[14px] uppercase">-</p>
                    <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[17px] uppercase">0 PTS</p>
                    <div className="flex items-center gap-1">
                      <ShillIcon />
                      <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[17px] text-white">0</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="grid grid-cols-3">
            <div className="col-span-3 flex place-content-center h-32 overflow-hidden">
              <ShillerPlatform />
            </div>
          </div>
        </div>
        <div className="w-full sticky top-0">
          {rest.length > 0 ? (
            rest.map((el, idx) => (
              <div key={el.address} className="flex items-center justify-between w-full p-4 bg-[#161626]">
                  <div className="flex items-center gap-3">
                  <p className="font-bold font-offbit leading-[100%] tracking-[4%] text-[14px] p-2">{idx + 4}</p>
                  <div className="flex items-center gap-1">
                    <div className="size-8 bg-gray-700 rounded-full overflow-hidden">
                      <img src="/images/profile.jpg" alt={el.name} className="w-full h-full object-cover" />
                    </div>
                    <p className="font-bold font-offbit leading-[100%] tracking-[4%] text-[17px] uppercase">{el.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-1 flex-col">
                    <p className="font-bold font-offbit uppercase leading-[100%] tracking-[4%] text-[9px] text-gray-300">portfolio</p>
                    <div className="flex items-center gap-1">
                      <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[17px] text-white uppercase">{el.points} PTS</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-col">
                    <p className="font-bold font-offbit uppercase leading-[100%] tracking-[4%] text-[9px] text-gray-300">shill</p>
                    <div className="flex items-center gap-1">
                      <ShillIcon />
                      <p className="text-center font-bold font-offbit leading-[100%] tracking-[4%] text-[17px] text-white">{el.value}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : Players.length === 0 ? (
            <div className="flex items-center justify-center w-full p-8 text-gray-400">
              <p className="font-offbit">No participants found</p>
            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}

export default ShillerView
