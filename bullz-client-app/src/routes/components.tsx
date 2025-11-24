import CoinPlayer from '@/components/coins/coin-player'
import WalrusLogo from '@/components/logos/walrus.logo'

const ComponentsPage = () => {
    return (
        <CoinPlayer name='wal' mascot_svg={<WalrusLogo/>} mascot_colour='#97F0E5' points={2} change='-2.00'/>
    )
}

export default ComponentsPage