import React, {useCallback, useRef, useState} from 'react';
import ReactDomClient from 'react-dom/client';

import AppStateHOC from '../lib/app-state-hoc.jsx';
import GUI from '../containers/gui.jsx';
import {parseFolderId, listSb3Files, fetchProjectBytes} from '../lib/google-drive-slideshow.js';

// Supplied at build time via the GOOGLE_DRIVE_API_KEY env var (see webpack.config.js's
// DefinePlugin block) rather than hardcoded here, so the key isn't sitting in git history.
// See DEPENDENCIES-AND-CHANGES.md for setup steps. Left unset, every folder load will fail with
// a clear on-screen error rather than a confusing generic one.
const GOOGLE_API_KEY = process.env.GOOGLE_DRIVE_API_KEY;

const WrappedGui = AppStateHOC(GUI);

// Standalone Drive-folder slideshow: paste a public folder link, step through every .sb3 in it
// with Prev/Next. Deliberately separate from the main editor and from the gallery/player
// prototype — this loads each project's raw bytes straight into the VM (the same call
// "Load from your computer" makes), so it needs no re-hosting of files or asset-host wiring.
const SlideshowApp = () => {
    const guiRef = useRef(null);
    const [folderInput, setFolderInput] = useState('');
    const [files, setFiles] = useState([]);
    const [index, setIndex] = useState(0);
    const [status, setStatus] = useState('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const loadProjectFromList = useCallback(async (list, i) => {
        const file = list[i];
        if (!file) return;
        setStatus('loading-project');
        try {
            const bytes = await fetchProjectBytes(file.id, GOOGLE_API_KEY);
            const vm = guiRef.current.appState.store.getState().scratchGui.vm;
            // Deliberately not auto-running Green Flag here (unlike an earlier version of this
            // code) — calling it immediately after loadProject() resolves raced ahead of some
            // async asset setup that isn't part of that promise, so scripts referencing not-yet-
            // ready costumes/backdrops silently no-opped. Matches stock "Load from your computer"
            // behavior anyway, which also never auto-runs — the teacher clicks Green Flag same as
            // any other load.
            await vm.loadProject(bytes);
            setStatus('idle');
        } catch (err) {
            setStatus('error');
            setErrorMessage(err.message);
        }
    }, []);

    const loadFolder = useCallback(async () => {
        const folderId = parseFolderId(folderInput);
        if (!folderId) {
            setStatus('error');
            setErrorMessage('That doesn\'t look like a Drive folder link or ID.');
            return;
        }
        if (!GOOGLE_API_KEY) {
            setStatus('error');
            setErrorMessage('No Google API key has been configured for this page yet.');
            return;
        }
        setStatus('loading-list');
        setErrorMessage('');
        try {
            const foundFiles = await listSb3Files(folderId, GOOGLE_API_KEY);
            if (foundFiles.length === 0) {
                setStatus('error');
                setErrorMessage('No .sb3 files found in that folder.');
                return;
            }
            setFiles(foundFiles);
            setIndex(0);
            await loadProjectFromList(foundFiles, 0);
        } catch (err) {
            setStatus('error');
            setErrorMessage(err.message);
        }
    }, [folderInput, loadProjectFromList]);

    const goToIndex = useCallback(i => {
        if (i < 0 || i >= files.length) return;
        setIndex(i);
        loadProjectFromList(files, i);
    }, [files, loadProjectFromList]);

    return (
        <div style={{display: 'flex', flexDirection: 'column', height: '100vh'}}>
            <div style={{
                padding: '10px',
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                background: '#4C97FF',
                fontFamily: 'sans-serif',
                flexWrap: 'wrap'
            }}
            >
                <input
                    type="text"
                    placeholder="Paste a Google Drive folder link"
                    value={folderInput}
                    onChange={e => setFolderInput(e.target.value)}
                    style={{flex: '1 1 200px', minWidth: 0, padding: '6px', borderRadius: '4px', border: 'none'}}
                />
                <button
                    onClick={loadFolder}
                    disabled={status === 'loading-list'}
                >
                    {status === 'loading-list' ? 'Loading…' : 'Load Folder'}
                </button>
                {files.length > 0 && (
                    <React.Fragment>
                        <button
                            onClick={() => goToIndex(index - 1)}
                            disabled={index === 0 || status === 'loading-project'}
                        >
                            {'◀ Prev'}
                        </button>
                        <span style={{color: '#fff'}}>
                            {`${index + 1} / ${files.length}: ${files[index].name}`}
                        </span>
                        <button
                            onClick={() => goToIndex(index + 1)}
                            disabled={index === files.length - 1 || status === 'loading-project'}
                        >
                            {'Next ▶'}
                        </button>
                    </React.Fragment>
                )}
                {status === 'error' && (
                    <span style={{color: '#fff', background: '#D6316C', padding: '4px 8px', borderRadius: '4px'}}>
                        {errorMessage}
                    </span>
                )}
            </div>
            <div style={{flex: 1, position: 'relative'}}>
                <WrappedGui
                    ref={guiRef}
                    isPlayerOnly
                    canSave={false}
                />
            </div>
        </div>
    );
};

export default appTarget => {
    GUI.setAppElement(appTarget);
    const root = ReactDomClient.createRoot(appTarget);
    root.render(<SlideshowApp />);
};
