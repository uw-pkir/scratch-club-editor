// Helpers for the standalone Drive-folder slideshow viewer. Deliberately independent of the
// gallery/player prototype (render-scratch-club-player.jsx) — this loads each project's raw .sb3
// bytes directly into the VM (the same call "Load from your computer" already makes), so it needs
// no project-host/asset-host configuration and no re-hosting of files anywhere. The only external
// service involved is the public Google Drive API.

// Accepts a full folder share URL or a bare folder ID.
export const parseFolderId = input => {
    const trimmed = (input || '').trim();
    const urlMatch = trimmed.match(/\/folders\/([\w-]+)/);
    if (urlMatch) return urlMatch[1];
    const idMatch = trimmed.match(/^[\w-]{10,}$/);
    return idMatch ? trimmed : null;
};

const DRIVE_FILES_ENDPOINT = 'https://www.googleapis.com/drive/v3/files';

/**
 * List .sb3 files directly inside a public Google Drive folder, oldest first.
 * @param {string} folderId - the Drive folder ID (not a full URL).
 * @param {string} apiKey - a Google API key with the Drive API enabled.
 * @returns {Promise<Array<{id: string, name: string}>>} the files found.
 * @throws {Error} with a message meant to be shown directly to the teacher if the request fails
 *   (e.g. the folder isn't shared publicly, or the API key is missing/invalid).
 */
export const listSb3Files = async (folderId, apiKey) => {
    const query = encodeURIComponent(`'${folderId}' in parents and name contains '.sb3' and trashed = false`);
    const url = `${DRIVE_FILES_ENDPOINT}?q=${query}&fields=files(id,name)` +
        `&orderBy=createdTime&key=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
        const body = await response.json().catch(() => null);
        const reason = body?.error?.message || `HTTP ${response.status}`;
        throw new Error(
            `Couldn't read that Drive folder (${reason}). Check that it's shared as ` +
            '"Anyone with the link" can view, and that the folder ID is correct.'
        );
    }

    const {files} = await response.json();
    return files || [];
};

/**
 * Fetch a Drive file's raw bytes, suitable for VM.loadProject().
 * @param {string} fileId - the Drive file ID.
 * @param {string} apiKey - a Google API key with the Drive API enabled.
 * @returns {Promise<ArrayBuffer>} the file's contents.
 */
export const fetchProjectBytes = async (fileId, apiKey) => {
    const url = `${DRIVE_FILES_ENDPOINT}/${fileId}?alt=media&key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Couldn't download that project (HTTP ${response.status}).`);
    }
    return response.arrayBuffer();
};
