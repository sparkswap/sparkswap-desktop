import React, { ReactNode } from 'react'
import {
  InputGroup,
  FileInput
} from '@blueprintjs/core'
import './FilePathInput.css'

interface FilePathInputProps {
  onChange: (path: string) => void,
  value: string,
  id?: string,
  placeholder?: string
}

class FilePathInput extends React.Component<FilePathInputProps> {
  handlePathChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    this.props.onChange(e.target.value)
  }

  handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (!e.target.files || !e.target.files.length) return
    // Electron exposes a `path` property on File objects
    // @ts-ignore
    this.props.onChange(e.target.files[0].path)
  }

  render (): ReactNode {
    const { value, id, placeholder } = this.props
    return (
      <InputGroup
        id={id}
        className="FilePathInput"
        placeholder={placeholder}
        value={value}
        onChange={this.handlePathChange}
        rightElement={
          <FileInput
            fill={false}
            text=""
            onInputChange={this.handleFileChange}
          />
        }
      />
    )
  }
}

export default FilePathInput
