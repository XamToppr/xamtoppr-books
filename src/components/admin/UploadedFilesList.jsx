import { useEffect, useMemo, useState } from 'react';
import { useClient } from 'sanity';

const UPLOAD_TYPES = ['Book PDF', 'Cover Image', 'Study Notes', 'Other'];
const UPLOADED_FILES_QUERY = `*[_type == "uploadedFile"] | order(uploadedAt desc) {
  _id,
  filename,
  url,
  uploadType,
  remark,
  uploadedAt
}`;

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

export default function UploadedFilesList() {
  const studioClient = useClient({ apiVersion: '2024-01-01' });
  const [files, setFiles] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState('');
  const [editingRemark, setEditingRemark] = useState('');
  const [editingType, setEditingType] = useState(UPLOAD_TYPES[0]);
  const [savingId, setSavingId] = useState('');
  const [deletingId, setDeletingId] = useState('');

  useEffect(() => {
    let isActive = true;

    const loadFiles = async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        const result = await studioClient.fetch(UPLOADED_FILES_QUERY);
        if (isActive) setFiles(result);
      } catch (error) {
        console.error('Unable to load uploaded files from Sanity.', error);
        if (isActive) {
          setLoadError(error instanceof Error ? error.message : 'Unknown error loading uploaded files.');
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    loadFiles();
    return () => {
      isActive = false;
    };
  }, [studioClient]);

  const filteredFiles = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return files;
    return files.filter((file) => (
      [file.remark, file.filename].some((value) => value?.toLocaleLowerCase().includes(query))
    ));
  }, [files, search]);

  const startEditing = (file) => {
    setMessage('');
    setEditingId(file._id);
    setEditingRemark(file.remark || '');
    setEditingType(file.uploadType || UPLOAD_TYPES[0]);
  };

  const saveEdit = async (event, file) => {
    event.preventDefault();
    setSavingId(file._id);
    setMessage('');
    try {
      await studioClient.patch(file._id).set({
        remark: editingRemark.trim(),
        uploadType: editingType
      }).commit();
      setFiles((current) => current.map((item) => (
        item._id === file._id
          ? { ...item, remark: editingRemark.trim(), uploadType: editingType }
          : item
      )));
      setEditingId('');
      setMessage('File details updated.');
    } catch (error) {
      console.error(`Unable to update uploaded file "${file._id}".`, error);
      setMessage(error instanceof Error ? `Could not update file: ${error.message}` : 'Could not update file.');
    } finally {
      setSavingId('');
    }
  };

  const deleteRecord = async (file) => {
    const confirmed = window.confirm(
      `Remove the tracking record for "${file.filename}"? The Sanity asset itself will remain available.`
    );
    if (!confirmed) return;

    setDeletingId(file._id);
    setMessage('');
    try {
      await studioClient.delete(file._id);
      setFiles((current) => current.filter((item) => item._id !== file._id));
      if (editingId === file._id) setEditingId('');
      setMessage('Upload tracking record deleted. The Sanity asset was kept.');
    } catch (error) {
      console.error(`Unable to delete uploaded file record "${file._id}".`, error);
      setMessage(error instanceof Error ? `Could not delete record: ${error.message}` : 'Could not delete record.');
    } finally {
      setDeletingId('');
    }
  };

  const copyUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setMessage('URL copied to clipboard.');
    } catch (error) {
      console.error('Unable to copy the Sanity asset URL.', error);
      setMessage('Could not copy URL. Check clipboard permissions.');
    }
  };

  return (
    <section className="file-upload__list" aria-labelledby="all-upload-files-heading" role="tabpanel">
      <div className="file-upload__list-header">
        <div>
          <h2 id="all-upload-files-heading">All Upload Files</h2>
          <p>Search and manage files uploaded through this tool.</p>
        </div>
        <label className="file-upload__search">
          <span>Search files</span>
          <input
            type="search"
            value={search}
            placeholder="Search by remark or filename"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>

      {message && (
        <p className="file-upload__message" role="status">{message}</p>
      )}
      {loadError && (
        <p className="file-upload__message file-upload__message--error" role="alert">
          Could not load uploaded files: {loadError}
        </p>
      )}
      {isLoading ? (
        <p className="file-upload__message" role="status">Loading uploaded files...</p>
      ) : !loadError ? (
        <div className="file-upload__table-wrap">
          <table className="file-upload__table">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Remark / Title</th>
                <th scope="col">URL</th>
                <th scope="col">Date</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.map((file, index) => (
                <tr key={file._id}>
                  <td>{index + 1}</td>
                  <td>
                    {editingId === file._id ? (
                      <form
                        className="file-upload__edit-form"
                        onSubmit={(event) => saveEdit(event, file)}
                      >
                        <input
                          aria-label={`Remark for ${file.filename}`}
                          maxLength={500}
                          placeholder="Optional remark"
                          type="text"
                          value={editingRemark}
                          onChange={(event) => setEditingRemark(event.target.value)}
                        />
                        <select
                          aria-label={`Upload type for ${file.filename}`}
                          value={editingType}
                          onChange={(event) => setEditingType(event.target.value)}
                        >
                          {UPLOAD_TYPES.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                        <div className="file-upload__row-actions">
                          <button
                            className="file-upload__primary"
                            disabled={savingId === file._id}
                            type="submit"
                          >
                            {savingId === file._id ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            className="file-upload__secondary"
                            disabled={savingId === file._id}
                            type="button"
                            onClick={() => setEditingId('')}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <strong>{file.remark || file.filename}</strong>
                        {file.remark && <span className="file-upload__table-secondary">{file.filename}</span>}
                        {file.uploadType && <span className="file-upload__table-secondary">{file.uploadType}</span>}
                      </>
                    )}
                  </td>
                  <td>
                    <div className="file-upload__url-actions">
                      <a href={file.url} rel="noreferrer" target="_blank">{file.url}</a>
                      <button
                        className="file-upload__secondary"
                        type="button"
                        onClick={() => copyUrl(file.url)}
                      >
                        Copy URL
                      </button>
                      <a
                        className="file-upload__secondary"
                        href={file.url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        View
                      </a>
                    </div>
                  </td>
                  <td>{formatDate(file.uploadedAt)}</td>
                  <td>
                    <div className="file-upload__row-actions">
                      {editingId !== file._id && (
                        <button
                          className="file-upload__secondary"
                          disabled={Boolean(editingId) || Boolean(deletingId)}
                          type="button"
                          onClick={() => startEditing(file)}
                        >
                          Edit
                        </button>
                      )}
                      <button
                        className="file-upload__danger"
                        disabled={Boolean(deletingId) || Boolean(savingId)}
                        type="button"
                        onClick={() => deleteRecord(file)}
                      >
                        {deletingId === file._id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredFiles.length && (
                <tr>
                  <td className="file-upload__empty" colSpan="5">
                    {search ? 'No files match your search.' : 'No uploaded files yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
