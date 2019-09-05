declare module '*.svg' {
  import { ReactComponentElement } from 'react'
  export const ReactComponent: ReactComponentElement

  const svgSrc: string
  export default svgSrc
}

declare module '*.png' {
  const pngSrc: string
  export default pngSrc
}

declare module '*.txt' {
  const contents: string
  export default contents
}
