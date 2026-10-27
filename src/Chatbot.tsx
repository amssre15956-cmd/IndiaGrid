import AssistantPanel from './assistant/AssistantPanel'

/** Floating EV Planning Assistant (offline, local Llama via the FastAPI backend in /backend). */
export default function Chatbot({ context }: { context?: 'scale' }) {
  return <AssistantPanel context={context} />
}
