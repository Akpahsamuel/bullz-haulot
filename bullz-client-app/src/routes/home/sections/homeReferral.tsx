import CopyIcon from "@/components/icons/copy.icon"

const HomeReferral = () => {
    return (
        <>
            <div className="bg-gray-850 px-4 py-3 grid gap-3 border-[0.5px] border-gray-600">
                <p className="font-offbit font-bold text-sm leading-[100%] tracking-[4%] text-gray-400 uppercase">get some reward</p>
                <p className="font-offbit font-bold text-sm leading-[100%] tracking-[4%] uppercase">Share your invite code and earn a reward <br /> when they buy a share</p>
                <div className="border border-dashed border-gray-600 bg-gray-700 p-2 flex items-center justify-between">
                    <p className="font-offbit font-bold text-sm leading-[100%] tracking-[4%] uppercase">aw233gg</p>
                    <button className="flex items-center gap-1 text-gray-300">
                        <p className="font-offbit font-bold text-sm leading-[100%] tracking-[4%] uppercase flex">tap to copy</p>
                        <CopyIcon  height={16} width={16}/>
                    </button>
                </div>
            </div>
        </>
    )
}

export default HomeReferral