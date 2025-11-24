import React from 'react'

const EthLogo = (props: React.SVGProps<SVGSVGElement>) => {
    return (
        <svg width="37" height="58" viewBox="0 0 37 58" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path d="M18.1216 0V21.4406L36.2434 29.5383L18.1216 0Z" fill="white" fill-opacity="0.602" />
            <path d="M18.1242 0L0 29.5383L18.1242 21.4406V0Z" fill="white" />
            <path d="M18.1216 43.4318V58.0003L36.2555 32.9121L18.1216 43.4318Z" fill="white" fill-opacity="0.602" />
            <path d="M18.1242 58.0003V43.4294L0 32.9121L18.1242 58.0003Z" fill="white" />
            <path d="M18.1216 40.0602L36.2434 29.5381L18.1216 21.4453V40.0602Z" fill="white" fill-opacity="0.2" />
            <path d="M0 29.5381L18.1242 40.0602V21.4453L0 29.5381Z" fill="white" fill-opacity="0.602" />
        </svg>
    )
}

export default EthLogo