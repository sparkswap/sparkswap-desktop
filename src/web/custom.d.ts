declare module '*.svg' {
  import { ReactComponentElement } from 'react'
  export const ReactComponent: ReactComponentElement
}

declare module '*.txt' {
  const contents: string
  export default contents
}
