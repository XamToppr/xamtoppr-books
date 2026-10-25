import { useRef, useState } from 'react';
import { useClient } from 'sanity';
import './FileUpload.css';

const UPLOAD_TYPES = ['Book PDF', 'Cover Image', 'Study Notes', 'Other'];

const createEntry = (id) => ({
  id,
  uploadType: UPLOAD_TYPES[0],
  file: null,
  remark: '',
  asset: null,
  status: 'idle',
  error: '',
  copyFeedback: ''
});

const getAssetType = (file) => {
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) return 'file';
  if (file.type.startsWith('image/')) return 'image';
  return null;
};

export default function FileUpload() {
  const studioClient = useClient({ apiVersion: '2024-01-01' });
  const nextId = useRef(2);
  const [entries, setEntries] = useState(() => [createEntry(1)]);
  const [isUploading, setIsUploading] = useState(false);
  const [formError, setFormError] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');

  const updateEntry = (id, changes) => {
    setEntries((current) => current.map((entry) => (
      entry.id === id ? { ...entry, ...changes } : entry
    )));
  };

  const handleFileChange = (id, file) => {
    setFormError('');
    setUploadMessage('');
    if (!file) return;

    if (!getAssetType(file)) {
      updateEntry(id, {
        file: null,
        asset: null,
        status: 'idle',
        error: 'Choose a PDF or image file.'
      });
      return;
    }

    updateEntry(id, {
      file,
      asset: null,
      status: 'idle',
      error: '',
      copyFeedback: ''
    });
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    setFormError('');
    setUploadMessage('');

    const missingFileIndex = entries.findIndex((entry) => !entry.file);
    if (missingFileIndex !== -1) {
      setFormError(`Choose a file for item ${missingFileIndex + 1} before uploading.`);
      return;
    }

    setIsUploading(true);
    let uploadedCount = 0;
    let failedCount = 0;

    try {
      for (const entry of entries) {
        updateEntry(entry.id, { status: 'uploading', error: '', copyFeedback: '' });

        try {
          const assetType = getAssetType(entry.file);
          const asset = await studioClient.assets.upload(assetType, entry.file, {
            filename: entry.file.name,
            contentType: assetType === 'file' ? 'application/pdf' : entry.file.type,
            title: entry.file.name,
            label: entry.uploadType,
            description: entry.remark.trim() || undefined
          });

          if (!asset.url) {
            throw new Error('Sanity did not return a public asset URL.');
          }

          updateEntry(entry.id, { status: 'uploaded', asset });
          uploadedCount += 1;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown upload error.';
          console.error(`Unable to upload "${entry.file.name}".`, error);
          updateEntry(entry.id, { status: 'error', error: message });
          failedCount += 1;
        }
      }
    } finally {
      setIsUploading(false);
    }

    if (failedCount === 0) {
      setUploadMessage(`Successfully uploaded ${uploadedCount} file${uploadedCount === 1 ? '' : 's'}.`);
    } else {
      setFormError(`${uploadedCount} file${uploadedCount === 1 ? '' : 's'} uploaded; ${failedCount} failed. Check each item for details.`);
    }
  };

  const handleCopyUrl = async (entry) => {
    try {
      await navigator.clipboard.writeText(entry.asset.url);
      updateEntry(entry.id, { copyFeedback: 'URL copied to clipboard.' });
    } catch (error) {
      console.error('Unable to copy the Sanity asset URL.', error);
      updateEntry(entry.id, { copyFeedback: 'Could not copy URL. Check clipboard permissions.' });
    }
  };

  return (
    <main className="file-upload">
      <header className="file-upload__header">
        <h1>File Upload</h1>
        <p>Upload PDFs and images to Sanity and copy their public CDN URLs.</p>
      </header>

      <form onSubmit={handleUpload}>
        <div className="file-upload__items">
          {entries.map((entry, index) => (
            <section className="file-upload__item" key={entry.id}>
              <h2>File {index + 1}</h2>

              <div className="file-upload__fields">
                <label className="file-upload__field">
                  <span>Upload Type</span>
                  <select
                    disabled={isUploading}
                    value={entry.uploadType}
                    onChange={(event) => updateEntry(entry.id, {
                      uploadType: event.target.value,
                      asset: null,
                      status: 'idle'
                    })}
                  >
                    {UPLOAD_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>

                <div className="file-upload__field">
                  <span>Choose File</span>
                  <label className="file-upload__choose">
                    <input
                      accept=".pdf,image/*"
                      disabled={isUploading}
                      type="file"
                      onChange={(event) => {
                        handleFileChange(entry.id, event.target.files?.[0]);
                        event.target.value = '';
                      }}
                    />
                    <span className="file-upload__choose-button">Choose File</span>
                    <span className="file-upload__filename">
                      {entry.file?.name || 'No file chosen'}
                    </span>
                  </label>
                </div>

                <label className="file-upload__field">
                  <span>Enter Remark</span>
                  <input
                    disabled={isUploading}
                    maxLength={500}
                    placeholder="Optional note for this file"
                    type="text"
                    value={entry.remark}
                    onChange={(event) => updateEntry(entry.id, { remark: event.target.value })}
                  />
                </label>
              </div>

              {entry.error && (
                <p className="file-upload__message file-upload__message--error" role="alert">
                  {entry.error}
                </p>
              )}

              {entry.status === 'uploading' && (
                <p className="file-upload__message" role="status">Uploading to Sanity...</p>
              )}

              {entry.asset && (
                <div className="file-upload__result" role="status">
                  <p>Upload successful. Your public Sanity CDN URL:</p>
                  <a href={entry.asset.url} rel="noreferrer" target="_blank">{entry.asset.url}</a>
                  <button
                    className="file-upload__copy"
                    type="button"
                    onClick={() => handleCopyUrl(entry)}
                  >
                    Copy URL
                  </button>
                  {entry.copyFeedback && <span>{entry.copyFeedback}</span>}
                </div>
              )}
            </section>
          ))}
        </div>

        {formError && <p className="file-upload__message file-upload__message--error" role="alert">{formError}</p>}
        {uploadMessage && <p className="file-upload__message file-upload__message--success" role="status">{uploadMessage}</p>}

        <div className="file-upload__actions">
          <button
            className="file-upload__secondary"
            disabled={isUploading}
            type="button"
            onClick={() => {
              setEntries((current) => [...current, createEntry(nextId.current++)]);
              setFormError('');
              setUploadMessage('');
            }}
          >
            Add More
          </button>
          <button className="file-upload__primary" disabled={isUploading} type="submit">
            {isUploading ? 'Uploading...' : 'Upload File'}
          </button>
        </div>
      </form>
    </main>
  );
}
