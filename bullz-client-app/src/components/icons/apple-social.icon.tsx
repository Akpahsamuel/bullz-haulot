import { SVGProps } from "react";

const AppleSocialIcon = (props: SVGProps<SVGSVGElement>) => {
    return (
        <svg width="21" height="24" viewBox="0 0 21 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <g filter="url(#filter0_d_10983_77000)">
                <path d="M13.0003 2.33301V4.83301H12.167V5.66634H11.3337V6.49967H9.66699V3.99967H10.5003V3.16634H11.3337V2.33301H13.0003Z" fill="white" />
                <path d="M18 15.6667V16.5H17.1667V18.1667H16.3333V19H15.5V19.8333H14.6667V20.6667H13V19.8333H8.83333V20.6667H7.16667V19.8333H6.33333V19H5.5V18.1667H4.66667V17.3333H3.83333V15.6667H3V9.83333H3.83333V8.16667H4.66667V7.33333H6.33333V6.5H8.83333V7.33333H12.1667V6.5H14.6667V7.33333H16.3333V8.16667H17.1667V9H16.3333V9.83333H15.5V14H16.3333V14.8333H17.1667V15.6667H18Z" fill="#DADAE6" />
            </g>
            <defs>
                <filter id="filter0_d_10983_77000" x="-1.5" y="0" width="24" height="24" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
                    <feFlood flood-opacity="0" result="BackgroundImageFix" />
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                    <feOffset dy="0.5" />
                    <feGaussianBlur stdDeviation="1" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0.4 0 0 0 0 0.0862745 0 0 0 0 0 0 0 0 0.7 0" />
                    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_10983_77000" />
                    <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_10983_77000" result="shape" />
                </filter>
            </defs>
        </svg>

    )
}
export default AppleSocialIcon