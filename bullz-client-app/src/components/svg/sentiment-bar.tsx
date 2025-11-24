import { SVGProps } from "react"

const SentimentBar = (props: SVGProps<SVGSVGElement>) => {
    return (
        <svg width="6" height="32" viewBox="0 0 6 32" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path fillRule="evenodd" clipRule="evenodd" d="M5.99965 0H2.52708V2H0.639648V32H2.52708V30H4.4145V32H5.99965V22H4.4145V21H5.35822V11H4.4145V10H5.99965V0Z" fill={props.fill} />
        </svg>

    )
}

export default SentimentBar