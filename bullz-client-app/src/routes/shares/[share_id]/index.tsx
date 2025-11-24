import ChevronLeft from "@/components/icons/chevron-right"
import { Link, useParams } from "react-router"
import ShareSummary from "./sections/ShareSummary"
import ShareAction from "./sections/ShareAction"

const ShareDetail = () => {
    const { id } = useParams()
    
    return (
        <>
            <div className="h-dvh">
                <div className="h-12 px-6 py-3 grid grid-cols-3 items-center">
                    <Link to={"/shares"}>
                        <ChevronLeft />
                    </Link>
                    <p className="font-bold font-offbit leading-[100%] tracking-[4%] text-[17px] uppercase h-[17px]">Share details</p>
                </div>
                <div className="grid gap-4 p-6 h-[calc(100dvh-48px)] overflow-x-hidden overflow-y-scroll">
                    <ShareSummary vaultId={id} />
                    <ShareAction vaultId={id} />
                </div>
            </div>
        </>
    )
}

export default ShareDetail