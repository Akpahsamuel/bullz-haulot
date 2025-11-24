import IdeaIcon from "@/components/icons/idea.icon"
import SquadIcon from "@/components/icons/squad.icon"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog"
import React from "react"
import { useNavigate } from "react-router"

const EmptySquad = () => {
  const navigate = useNavigate()
  const [intro, setIntro] = React.useState(true)
  return (
    <>
      <div className="grid gap-4">
        <p className="font-offbit font-bold text-[27px] leading-[100%] tracking-[4%] text-gray-300 uppercase">SQUAD</p>
      </div>
      <div className="max-h-[calc(100dvh-250px)] h-full">
        <div className="min-h-full flex flex-col items-center justify-center gap-4">
          <SquadIcon />
          <p className="font-offbit font-bold text-[17px] leading-[100%] tracking-[4%] text-gray-300 uppercase text-center">No squad yet</p>
          <Button onClick={() => navigate("/squad/create")}>Create Squad</Button>
        </div>

        <Dialog open={intro} onOpenChange={(o) => setIntro(o)}>
          <DialogContent>
            <div className="grid gap-2">
              <div className="flex flex-col items-center justify-center gap-2">
                <IdeaIcon />
                <p className="font-offbit font-bold text-[22px] leading-[100%] tracking-[4%] uppercase text-gray-300">how to play</p>
              </div>
              <div className="p-1 bg-gray-700" style={{ boxShadow: "0px 3.82px 2.55px 0px #00000024, 0px -8px 0px 0px #0000003D inset" }}>
                <p className="font-offbit font-bold text-[17px] leading-[100%] tracking-[4%]">Your squad competes against others in our bi-weekly competition</p>
              </div>
              <div className="p-1 bg-gray-700" style={{ boxShadow: "0px 3.82px 2.55px 0px #00000024, 0px -8px 0px 0px #0000003D inset" }}>
                <p className="font-offbit font-bold text-[17px] leading-[100%] tracking-[4%]">Pick assests that you are bullish on</p>
              </div>
              <div className="p-1 bg-gray-700" style={{ boxShadow: "0px 3.82px 2.55px 0px #00000024, 0px -8px 0px 0px #0000003D inset" }}>
                <p className="font-offbit font-bold text-[17px] leading-[100%] tracking-[4%]">Check where your squad ranks at the end of every competition</p>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild className="w-full">
                <Button>I Understand</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

    </>
  )
}

export default EmptySquad
