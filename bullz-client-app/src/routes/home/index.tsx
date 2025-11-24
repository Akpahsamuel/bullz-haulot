import HomeBanner from "./sections/HomeBanner"
import HomeWhatPeopleBuy from "./sections/HomeWhatPeopleBuy"
import HomeCompetition from "./sections/HomeCompetition"
import HomeStreak from "./sections/HomeStreak"
import HomeReferral from "./sections/homeReferral"
import Header from "@/components/layout/header"
import NavBar from "@/components/layout/navbar"

const Home = () => {
    return (
        <>
            <div className="h-dvh">
                <div className="h-12">
                    <Header />
                    {/* <HomeHeader /> */}
                </div>
                <div className="grid gap-6 p-6 h-[calc(100dvh-112px)] overflow-x-hidden overflow-y-scroll">
                    <HomeBanner />
                    <HomeWhatPeopleBuy />
                    <HomeCompetition />
                    <HomeStreak />
                    <HomeReferral />
                </div>
                <div className="h-16">
                    <NavBar />
                </div>
            </div>
        </>
    )
}

export default Home