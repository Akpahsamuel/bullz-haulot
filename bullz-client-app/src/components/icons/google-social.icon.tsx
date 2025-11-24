import { SVGProps } from "react";

const GoogleSocialIcon = (props: SVGProps<SVGSVGElement>) => {
    return (
        <svg width="23" height="24" viewBox="0 0 23 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <g filter="url(#filter0_d_10983_112576)">
                <path d="M20.6663 9.83301V13.9997H19.833V15.6663H18.9997V17.333H18.1663V18.1663H17.333V18.9997H15.6663V19.833H13.9997V20.6663H8.99967V19.833H7.33301V18.9997H5.66634V18.1663H4.83301V17.333H3.99967V15.6663H3.16634V13.9997H2.33301V8.99967H3.16634V7.33301H3.99967V5.66634H4.83301V4.83301H5.66634V3.99967H7.33301V3.16634H8.99967V2.33301H13.9997V3.16634H15.6663V3.99967H17.333V5.66634H16.4997V6.49967H15.6663V7.33301H13.9997V6.49967H8.99967V7.33301H7.33301V8.99967H6.49967V13.9997H7.33301V15.6663H8.99967V16.4997H13.9997V15.6663H15.6663V13.9997H16.4997V13.1663H11.4997V9.83301H20.6663Z" fill="white" />
            </g>
            <defs>
                <filter id="filter0_d_10983_112576" x="-0.5" y="0" width="24" height="24" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                    <feFlood flood-opacity="0" result="BackgroundImageFix" />
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                    <feOffset dy="0.5" />
                    <feGaussianBlur stdDeviation="1" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0.4 0 0 0 0 0.0862745 0 0 0 0 0 0 0 0 0.7 0" />
                    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_10983_112576" />
                    <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_10983_112576" result="shape" />
                </filter>
            </defs>
        </svg>

    )
}
export default GoogleSocialIcon