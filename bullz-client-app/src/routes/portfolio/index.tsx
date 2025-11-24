import Header from "@/components/layout/header"
import NavBar from "@/components/layout/navbar"
import EmptyShares from "./components/EmptyShares"
import BoughtShares from "./components/BoughtShares"
import { useUserPortfolio, usePortfolioTotalValue } from "@/hooks/useUserPortfolio"

const PortfolioPage = () => {
    const { data: portfolio, isLoading } = useUserPortfolio()
    const { totalValue } = usePortfolioTotalValue()
    
    const hasAssets = portfolio && portfolio.length > 0

    return (
        <>
            <div className="h-dvh">
                <div className="h-12">
                    <Header />
                </div>

                <div className="flex flex-col gap-6  h-[calc(100dvh-112px)] p-6">
                    <div className="grid gap-4">
                        <p className="font-offbit font-bold text-[17px] leading-[100%] tracking-[4%] text-gray-300 uppercase">your assets</p>
                        <p className="font-offbit font-bold text-[34px] leading-[100%] tracking-[4%] uppercase">
                            {isLoading ? "..." : totalValue}
                        </p>
                    </div>
                    <div className="max-h-[calc(100dvh-250px)] h-full">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-gray-400">Loading portfolio...</p>
                            </div>
                        ) : hasAssets ? (
                            <BoughtShares portfolio={portfolio} />
                        ) : (
                            <EmptyShares />
                        )}
                    </div>
                </div>
                <div className="h-16">
                    <NavBar />
                </div>
            </div>
        </>
    )
}

export default PortfolioPage