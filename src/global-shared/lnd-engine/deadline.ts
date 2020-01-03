export function deadline (duration = 30): number {
  return new Date().setSeconds(new Date().getSeconds() + duration)
}
