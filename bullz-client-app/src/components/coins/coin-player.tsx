import { cn } from '@/lib/utils'
import React from 'react'

type CoinPlayerProps = {
    name: string
    mascot_svg: React.ReactNode
    mascot_colour: string
    points: number
    change: string
}

const CoinPlayer: React.FC<CoinPlayerProps> = ({ name, mascot_svg, mascot_colour, points, change}: CoinPlayerProps) => {
    return (
        <>
            <div className='flex flex-col max-w-28 w-full'>
                <div className='max-w-28 bg-white grid grid-cols-2 -mb-2 relative z-10'>
                    <div className={cn("py-1", change.startsWith("+") ? "bg-[#00FF00]": "bg-[#CC0000]")}>
                        <p className='font-bold text-body-lg uppercase text-black'>{change}</p>
                    </div>
                    <div className='border-l border-l-gray-300 py-1'>
                        <p className='font-bold text-body-lg uppercase text-black text-center'>{points} pts</p>
                    </div>
                </div>
                <div className='bg-white p-2 max-w-22 w-full grid gap-2 mx-auto'>
                    <div className={cn('flex items-center justify-center py-4')} style={{ backgroundColor: `${mascot_colour}` }}>
                        {mascot_svg}
                    </div>
                    <p className='text-title-lg uppercase text-center text-black font-bold'>{name}</p>
                </div>
            </div>
        </>
    )
}

export default CoinPlayer