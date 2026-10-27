/** Every <audio> element created by the assistant registers here so Exit can silence all of them. */
const active = new Set<HTMLAudioElement>()
export const registerAudio = (a: HTMLAudioElement) => { active.add(a); return () => { active.delete(a) } }
export function stopAllAudio() {
  active.forEach((a) => { a.pause(); a.currentTime = 0 })
}
