import React from "react"
import SentimentBar from "../svg/sentiment-bar"

type SentimentProps = {
    fillColor: string
    bgColor: string
    fillPercentage: number
    containerWidth: number
    barWidth: number
    barHeight: number
}
const SentimentComponent = (props: SentimentProps) => {
    const totalBoxes = React.useMemo(() => {
        return Math.floor((props.containerWidth + 2) / (props.barWidth + 2));
    }, [props.containerWidth, props.barWidth]);

    const filledBoxes = Math.round((props.fillPercentage / 100) * totalBoxes);

    return (<>
        <div className={`flex items-center justify-center gap-0.5`}>
            {Array.from({ length: totalBoxes }).map((_, idx) => (
                <SentimentBar key={idx} fill={idx < filledBoxes ? props.fillColor : props.bgColor} width={props.barWidth} height={props.barHeight} />
            ))}
        </div>
    </>)
}

export default SentimentComponent