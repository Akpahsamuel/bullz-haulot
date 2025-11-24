import BullHomeHeader from "@/components/svg/bull-home-header"
import { Button } from "@/components/ui/button"

const HomeBanner = () => {
    return (
        <div className="relative bg-gray-800 w-full h-min px-4 pt-4 pb-[27px] overflow-hidden">
            <div className="grid gap-4 max-w-[215px]">
                <h1 className="font-offbit uppercase font-bold text-body-lg">welcome to bullz</h1>
                <p className="font-offbit uppercase font-bold text-gray-300 text-body-md">The Fantasy Sports Layer <br/> for On-Chain Assets</p>
                <Button className="text-sm px-3 py-[11px] leading-[100%]">Learn How To Play</Button>
            </div>
            <div className="absolute inset-0 -translate-x-1 -translate-y-1 bg-black size-[18px]"></div>
            <div className="absolute inset-0 translate-y-6 -translate-x-0.5 bg-black size-[8px]"></div>
            <div className="absolute inset-0 translate-x-6 bg-black size-[8px]"></div>
            <div className="absolute inset-0 top-full left-full -translate-x-[18px] -translate-y-[18px] bg-black size-[18px] z-10"></div>
            <div className="absolute inset-0 top-full left-full -translate-x-[26px] -translate-y-[26px] bg-black size-[8px] z-10"></div>
            <BullHomeHeader className="absolute inset-0 left-full -translate-x-[123px]" height={168}/>
        </div>
    )
}

export default HomeBanner