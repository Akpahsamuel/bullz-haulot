import FolderIcon from "@/components/icons/folder.icon"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router"

const EmptyShares = () => {
    const navigate = useNavigate()
    return (
        <>
            <div className="min-h-full flex flex-col items-center justify-center gap-4">
                <FolderIcon />
                <p className="font-offbit font-bold text-[17px] leading-[100%] tracking-[4%] text-gray-300 uppercase text-center">No assets yet</p>
                <Button onClick={()=>navigate("/shares")}>Buy from Market</Button>
            </div>
        </>
    )
}

export default EmptyShares