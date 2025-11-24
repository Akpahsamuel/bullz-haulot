import BottomSheet from "@/components/general/bottom-sheet"
import FilterIcon from "@/components/icons/filter.icon"
import SquareCloseIcon from "@/components/icons/square-close.icon"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import React from "react"

const SharesTitle = () => {
    const [open, setOpen] = React.useState(false)
    const [priceChange, setPriceChange] = React.useState("1h")
    const [marketCap, setMarketCap] = React.useState("large")
    const [volume, setVolume] = React.useState("high")
    const [perfomance, setPerformance] = React.useState("gainers")
    return (
        <>
            <div className=" flex items-center justify-between w-full">
                <h1 className="font-offbit font-bold uppercase leading-[100%] tracking-[4%] text-[27px]">shares</h1>
                <button className="flex items-center gap-1 py-[10px] px-2 bg-gray-850" onClick={() => setOpen(true)}><FilterIcon /> <span className="h-3 font-offbit font-bold leading-[100%] tracking-[4%] text-[17px] text-gray-400 uppercase">filter</span></button>
            </div>
            <BottomSheet isOpen={open} onClose={() => setOpen(false)}>
                <div className="grid gap-6">
                    <div className="flex items-center justify-between">
                        <h1 className="font-offbit font-bold text-[22px] leading-[100%] tracking-[4%] uppercase">filter assets</h1>
                        <button onClick={() => setOpen(false)}><SquareCloseIcon /></button>
                    </div>
                    <div className="grid gap-8">
                        <div className="grid gap-3">
                            <p className="font-bold font-offbit text-[17px] uppercase leading-[100%] tracking-[4%] text-gray-400">price change</p>
                            <div className="flex items-center p-1 bg-gray-850">
                                <button className={cn("h-9 flex  items-center justify-center py-3 w-full font-offbit font-bold text-[17px] uppercase leading-[100%] tracking-[4%] text-gray-400", priceChange === "1h" && "bg-gray-700 text-white")} onClick={() => setPriceChange("1h")}>1h</button>
                                <button className={cn("h-9 flex  items-center justify-center py-3 w-full font-offbit font-bold text-[17px] uppercase leading-[100%] tracking-[4%] text-gray-400", priceChange === "24h" && "bg-gray-700 text-white")} onClick={() => setPriceChange("24h")}>24h</button>
                                <button className={cn("h-9 flex  items-center justify-center py-3 w-full font-offbit font-bold text-[17px] uppercase leading-[100%] tracking-[4%] text-gray-400", priceChange === "7d" && "bg-gray-700 text-white")} onClick={() => setPriceChange("7d")}>7d</button>
                                <button className={cn("h-9 flex  items-center justify-center py-3 w-full font-offbit font-bold text-[17px] uppercase leading-[100%] tracking-[4%] text-gray-400", priceChange === "30d" && "bg-gray-700 text-white")} onClick={() => setPriceChange("30d")}>30d</button>
                            </div>
                        </div>
                        <div className="grid gap-3">
                            <p className="font-bold font-offbit text-[17px] uppercase leading-[100%] tracking-[4%] text-gray-400">market cap</p>
                            <div className="flex items-center p-1 bg-gray-850">
                                <button className={cn("h-9 flex  items-center justify-center py-3 w-full font-offbit font-bold text-[17px] uppercase leading-[100%] tracking-[4%] text-gray-400", marketCap === "large" && "bg-gray-700 text-white")} onClick={() => setMarketCap("large")}>large</button>
                                <button className={cn("h-9 flex  items-center justify-center py-3 w-full font-offbit font-bold text-[17px] uppercase leading-[100%] tracking-[4%] text-gray-400", marketCap === "mid" && "bg-gray-700 text-white")} onClick={() => setMarketCap("mid")}>mid</button>
                                <button className={cn("h-9 flex  items-center justify-center py-3 w-full font-offbit font-bold text-[17px] uppercase leading-[100%] tracking-[4%] text-gray-400", marketCap === "small" && "bg-gray-700 text-white")} onClick={() => setMarketCap("small")}>small</button>
                                <button className={cn("h-9 flex  items-center justify-center py-3 w-full font-offbit font-bold text-[17px] uppercase leading-[100%] tracking-[4%] text-gray-400", marketCap === "micro" && "bg-gray-700 text-white")} onClick={() => setMarketCap("micro")}>micro</button>
                            </div>
                        </div>
                        <div className="grid gap-3">
                            <p className="font-bold font-offbit text-[17px] uppercase leading-[100%] tracking-[4%] text-gray-400">trading volume</p>
                            <div className="flex items-center p-1 bg-gray-850">
                                <button className={cn("h-9 flex  items-center justify-center py-3 w-full font-offbit font-bold text-[17px] uppercase leading-[100%] tracking-[4%] text-gray-400", volume === "high" && "bg-gray-700 text-white")} onClick={() => setVolume("high")}>high liquidity</button>
                                <button className={cn("h-9 flex  items-center justify-center py-3 w-full font-offbit font-bold text-[17px] uppercase leading-[100%] tracking-[4%] text-gray-400", volume === "low" && "bg-gray-700 text-white")} onClick={() => setVolume("low")}>Low liquidity</button>
                            </div>
                        </div>
                        <div className="grid gap-3">
                            <p className="font-bold font-offbit text-[17px] uppercase leading-[100%] tracking-[4%] text-gray-400">price perfomance</p>
                            <div className="flex items-center p-1 bg-gray-850">
                                <button className={cn("h-9 flex  items-center justify-center py-3 w-full font-offbit font-bold text-[17px] uppercase leading-[100%] tracking-[4%] text-gray-400", perfomance === "gainers" && "bg-gray-700 text-white")} onClick={() => setPerformance("gainers")}>gainers</button>
                                <button className={cn("h-9 flex  items-center justify-center py-3 w-full font-offbit font-bold text-[17px] uppercase leading-[100%] tracking-[4%] text-gray-400", perfomance === "losers" && "bg-gray-700 text-white")} onClick={() => setPerformance("losers")}>losers</button>
                                <button className={cn("h-9 flex  items-center justify-center py-3 w-full font-offbit font-bold text-[17px] uppercase leading-[100%] tracking-[4%] text-gray-400", perfomance === "volatile" && "bg-gray-700 text-white")} onClick={() => setPerformance("volatile")}>volatile</button>
                            </div>
                        </div>
                        <div className="grid gap-3">
                            <p className="font-bold font-offbit text-[17px] uppercase leading-[100%] tracking-[4%] text-gray-400">price range</p>
                            <div className="flex items-center p-1 bg-gray-850">
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <Button className="max-w-[175px] w-full bg-gray-700 border-gray-850">Clear Filter</Button>
                        <Button className="max-w-[175px] w-full">Apply filter</Button>
                    </div>
                </div>
            </BottomSheet>
        </>
    )
}

export default SharesTitle