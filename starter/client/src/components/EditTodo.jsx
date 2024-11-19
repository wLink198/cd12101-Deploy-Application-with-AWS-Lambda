import { useAuth0 } from '@auth0/auth0-react'
import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button, Form } from 'semantic-ui-react'
import { getUploadUrl, patchTodo, uploadFile } from '../api/todos-api'

const UploadState = {
  NoUpload: 'NoUpload',
  FetchingPresignedUrl: 'FetchingPresignedUrl',
  UploadingFile: 'UploadingFile'
}

export function EditTodo() {
  function renderButton() {
    return (
      <div>
        {uploadState === UploadState.FetchingPresignedUrl && (
          <p>Uploading image metadata</p>
        )}
        {uploadState === UploadState.UploadingFile && <p>Uploading file</p>}
        <Button loading={uploadState !== UploadState.NoUpload} type="submit">
          Upload
        </Button>
      </div>
    )
  }

  function handleFileChange(event) {
    const files = event.target.files
    if (!files) return

    setFile(files[0])
  }

  async function handleSubmit(event) {
    event.preventDefault()

    try {
      if (!file) {
        alert('File should be selected')
        return
      }

      setUploadState(UploadState.FetchingPresignedUrl)
      const accessToken = await getAccessTokenSilently({
        audience: `api-for-pj4`,
        scope: 'write:todos'
      })
      const uploadUrl = await getUploadUrl(accessToken, todoId)

      setUploadState(UploadState.UploadingFile)
      await uploadFile(uploadUrl, file)

      console.log('File was uploaded!')

      await patchTodo(accessToken, todoId, { attachmentUrl: `${todoId}.png` });

      window.location.href = window.location.origin
    } catch (e) {
      alert('Could not upload a file: ' + e.message)
    } finally {
      setUploadState(UploadState.NoUpload)
    }
  }

  const [file, setFile] = useState(undefined)
  const [uploadState, setUploadState] = useState(UploadState.NoUpload)
  const { getAccessTokenSilently } = useAuth0()
  const { todoId } = useParams()

  return (
    <div>
      <h1>Upload new image</h1>

      <Form onSubmit={handleSubmit}>
        <Form.Field>
          <label>File</label>
          <input
            type="file"
            accept="image/*"
            placeholder="Image to upload"
            onChange={handleFileChange}
          />
        </Form.Field>

        {renderButton()}
      </Form>
    </div>
  )
}
