export type Quality = 'OK' | 'SAMPLE' | 'SYNTHETIC' | 'INCOMPLETE' | 'UNAVAILABLE'
export type MsgStatus = 'streaming' | 'done' | 'error' | 'stopped' | 'incomplete'

export type AssistantEvent =
  | { event: 'transcription'; text: string }
  | { event: 'token'; text: string }
  | { event: 'source'; sources: string[]; data_quality?: Quality; notes?: string[] }
  | { event: 'audio'; audio_url: string }
  | { event: 'audio_unavailable'; reason: string }
  | { event: 'done' }
  | { event: 'stopped' }
  | { event: 'error'; message: string }

export interface ChatMsg {
  id: string
  role: 'user' | 'assistant' | 'system'
  text: string
  time: number
  status: MsgStatus
  sources?: string[]
  quality?: Quality
  notes?: string[]
  audioUrl?: string
  audioError?: string
  attachment?: string
}

export type ServiceState = 'READY' | 'DEGRADED' | 'UNAVAILABLE' | 'NOT_CONFIGURED'
export interface Health {
  status: ServiceState
  components: Record<string, { status: ServiceState; detail?: string }>
}

export interface PendingFile {
  file: File
  status: 'ready' | 'error'
  error?: string
}

export const ALLOWED_EXT = ['csv', 'xlsx', 'json', 'geojson', 'pdf', 'png', 'jpg', 'jpeg']
export const MAX_UPLOAD_MB = 25
