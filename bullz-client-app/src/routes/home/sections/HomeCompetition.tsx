import { Link } from "react-router"

const HomeCompetition = () => {
    return (
        <>
            <Link to="/ranking">
                <div className="h-[84px] bg-gray-850">
                    <img src="/competition/walrus-comp.png" alt="" />
                </div>
            </Link>
        </>
    )
}

export default HomeCompetition