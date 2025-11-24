import Header from "@/components/layout/header"
import NavBar from "@/components/layout/navbar"
import SharesTitle from "./sections/SharesTitle"
import SharesMarketCap from "./sections/SharesCap"
import SharesMarket from "./sections/SharesMarket"

const Shares = () => {
    return (
        <>
            <div className="h-dvh">
                <div className="h-12">
                    <Header />
                </div>
                <div className="grid gap-4 p-6 h-[calc(100dvh-112px)] overflow-x-hidden overflow-y-scroll">
                    <SharesTitle />
                    <SharesMarketCap />
                    <SharesMarket />
                </div>
                <div className="h-16">
                    <NavBar />
                </div>
            </div>
        </>
    )
}

export default Shares