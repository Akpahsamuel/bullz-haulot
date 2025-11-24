import Header from "@/components/layout/header"
import NavBar from "@/components/layout/navbar"
import EmptySquad from "./components/EmptySquad"
import FilledSquad from "./components/FilledSquad"
import { useGetUserSquads } from "@/lib/hooks/use-squad-contract"

const SquadPage = () => {
    const { data: userSquads, isLoading, error } = useGetUserSquads();
    
    // Show loading state
    if (isLoading) {
        return (
            <>
                <div className="h-dvh">
                    <div className="h-12">
                        <Header />
                    </div>
                    <div className="flex flex-col gap-6 h-[calc(100dvh-112px)] p-6 items-center justify-center">
                        <div className="text-gray-400">Loading squads...</div>
                    </div>
                    <div className="h-16">
                        <NavBar />
                    </div>
                </div>
            </>
        )
    }

    // Show error state
    if (error) {
        return (
            <>
                <div className="h-dvh">
                    <div className="h-12">
                        <Header />
                    </div>
                    <div className="flex flex-col gap-6 h-[calc(100dvh-112px)] p-6 items-center justify-center">
                        <div className="text-red-400">Failed to load squads</div>
                        <div className="text-gray-500 text-sm">
                            {error?.message || "Unknown error"}
                        </div>
                    </div>
                    <div className="h-16">
                        <NavBar />
                    </div>
                </div>
            </>
        )
    }

    // Show appropriate component based on whether user has squads
    const hasSquads = userSquads && userSquads.length > 0;
    
    return (
        <>
            <div className="h-dvh">
                <div className="h-12">
                    <Header />
                </div>

                <div className="flex flex-col gap-6  h-[calc(100dvh-112px)] p-6">
                    {hasSquads ? <FilledSquad userSquads={userSquads} /> : <EmptySquad />}
                </div>
                <div className="h-16">
                    <NavBar />
                </div>
            </div>
        </>
    )
}

export default SquadPage