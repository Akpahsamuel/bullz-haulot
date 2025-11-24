import React from "react"
import ActionModal from "@/components/general/modals/action-modal"
import FlameIcon from "@/components/icons/flame.icon"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import QuestionIcon from "@/components/icons/question.icon"

type Streak = {
    day: number
    status: 'logged' | 'missed' | ''
}

const HomeStreak = () => {
    const [recover, setRecover] = React.useState(false)
    const [show, setShow] = React.useState(false)

    const streaks: Array<Streak> = [
        {
            day: 30,
            status: ''
        },
        {
            day: 29,
            status: ''
        },
        {
            day: 28,
            status: ''
        },
        {
            day: 27,
            status: ''
        },
        {
            day: 26,
            status: ''
        },
        {
            day: 25,
            status: ''
        },
        {
            day: 24,
            status: ''
        },
        {
            day: 23,
            status: ''
        },
        {
            day: 22,
            status: 'logged'
        },
        {
            day: 21,
            status: 'logged'
        },
        {
            day: 20,
            status: 'logged'
        },
        {
            day: 19,
            status: 'logged'
        },
        {
            day: 18,
            status: 'logged'
        },
        {
            day: 17,
            status: 'logged'
        },
        {
            day: 16,
            status: 'logged'
        },
        {
            day: 15,
            status: 'logged'
        },
        {
            day: 14,
            status: 'missed'
        },
        {
            day: 13,
            status: 'missed'
        },
        {
            day: 12,
            status: 'logged'
        },
        {
            day: 11,
            status: 'logged'
        },
        {
            day: 10,
            status: 'logged'
        },
        {
            day: 9,
            status: 'logged'
        },
        {
            day: 8,
            status: 'logged'
        },
        {
            day: 7,
            status: 'logged'
        },
        {
            day: 6,
            status: 'logged'
        },
        {
            day: 5,
            status: 'logged'
        },
        {
            day: 4,
            status: 'logged'
        },
        {
            day: 3,
            status: 'logged'
        },
        {
            day: 2,
            status: 'logged'
        },
        {
            day: 1,
            status: 'logged'
        },
    ]
    return (
        <>
            <div className="bg-gray-850 grid gap-5 px-4 py-5">
                <div className="flex items-center gap-2">
                    <FlameIcon />
                    <h1 className="font-offbit font-bold text-[17px] leading-[100%] tracking-[4%] uppercase">8 Days login streak</h1>
                </div>
                <p className="font-offbit font-bold text-sm leading-[100%] tracking-[4%] uppercase text-gray-300">earn shill points every day you login. click ona<br /> any missed check-in day to buy it back and<br /> restore your streak.</p>
                <div className={cn("grid grid-cols-10 gap-1 h-[calc(64px+4px)] overflow-hidden", show && "h-min")}>
                    {streaks.map((el, idx) => (
                        <div
                            key={idx}
                            className={cn("size-8 grid place-content-center", el.status === 'logged' ? "bg-[#00B200] " : el.status === 'missed' ? "bg-[#E50000]" : "bg-gray-800 ")}
                            onClick={() => {
                                if (el.status === 'missed') {
                                    setRecover(true)
                                }
                            }}
                        >
                            <p className={cn("font-offbit font-bold text-sm leading-[100%] tracking-[4%] uppercase", el.status !== '' ? "text-white" : "text-gray-500")}>{el.day}</p>
                        </div>
                    ))}
                </div>
                <button className="font-offbit font-bold text-sm leading-[100%] tracking-[4%] underline uppercase text-gray-200" onClick={() => setShow(!show)}>{show ? "Show less" : "show more"}</button>
            </div>
            <ActionModal isOpen={recover} onClose={() => setRecover(false)}>
                <div className="grid gap-4">
                    <QuestionIcon className="mx-auto" />
                    <h1 className="text-center uppercase font-bold font-offbit text-[22px] leading-[100%] tracking-[4%]">Recover Streak</h1>
                    <p className="text-center uppercase font-bold font-offbit text-[17px] leading-[100%] tracking-[4%] text-[#9898B3]">Your streak broke! use 1 usdc to restore it and recover rewards for that day.</p>
                    <Button className="w-full">Recover with 1 usdc</Button>
                    <Button className="w-full bg-gray-700 border-gray-700" onClick={() => setRecover(false)}>Cancel</Button>
                </div>
            </ActionModal>
        </>
    )
}

export default HomeStreak