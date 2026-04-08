'use client'

import { useAudioPlayer } from '../../hooks/useAudioPlayer'
import dynamic from 'next/dynamic'

const AudioSidePanel = dynamic(() => import('./AudioSidePanel'), { ssr: false })
const MobileBottomSheet = dynamic(() => import('./MobileBottomSheet'), { ssr: false })
const AudioPanelContent = dynamic(() => import('./AudioPanelContent'), { ssr: false })

interface Props {
  children: React.ReactNode
}

export default function AudioShell({ children }: Props) {
  const { playerState, setPlayerState } = useAudioPlayer()
  const showPanel = playerState === 'panel'

  return (
    <div className="flex h-full">
      <div className={`flex-1 min-w-0 transition-all duration-300 ${showPanel ? 'xl:mr-96' : ''}`}>
        {children}
      </div>
      {/* Desktop: side panel (lg+) */}
      {showPanel && (
        <div className="hidden lg:block">
          <AudioSidePanel />
        </div>
      )}
      {/* Mobile: bottom sheet (< lg) */}
      {showPanel && (
        <div className="lg:hidden">
          <MobileBottomSheet onClose={() => setPlayerState('bar')}>
            <AudioPanelContent />
          </MobileBottomSheet>
        </div>
      )}
    </div>
  )
}
